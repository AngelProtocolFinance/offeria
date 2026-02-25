import crypto from "node:crypto";
import type { NP } from "@/nowpayments/types";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { nvs } from "../../env";
import { aws_monitor } from "../../kit/discord";
import { don2db } from "../../tables/donations";
import { resp } from "../resp";
import { handle_confirming } from "./handlers/confirming";
import { handle_failed } from "./handlers/failed";
import { handle_settled } from "./handlers/settled";

export const index: APIGatewayProxyHandlerV2 = async (event) => {
  const stage = nvs.app.env;
  const sig = event.headers["x-nowpayments-sig"];
  if (!sig) return resp.err(400, "invalid request");

  /// hash payload ///
  const payment: NP.PaymentPayload = JSON.parse(event.body ?? "{}");

  const payment_sorted: any = {};
  for (const [k, v] of Object.entries(payment).toSorted(([a], [b]) =>
    a.localeCompare(b)
  )) {
    payment_sorted[k] = v;
  }

  const hmac = crypto.createHmac("sha512", nvs.nowpayments.ipn_secret);
  hmac.update(JSON.stringify(payment_sorted));
  const payload_sig = hmac.digest("hex");

  if (payload_sig !== sig) {
    return resp.err(400, "invalid request");
  }

  const status = payment.payment_status;

  try {
    if (
      // can be considered `pending`
      status === "sending" ||
      //if a donation failed (e.g. less than min amount) we would proceed with the actual amount (if still processable - not too small)
      status === "refunded" ||
      // `confirming` event switches the intent to `pending`
      status === "confirmed"
    ) {
      console.info(status, payment);
      return resp.txt("unhandled");
    }

    if (status === "waiting") {
      const res = await don2db.update(payment.order_id, {
        via_extra: payment.payment_id.toString(),
      });
      console.info("waiting", res);
      return resp.json(res);
    }

    if (status === "confirming") {
      const res = await handle_confirming(payment, stage);
      console.info("confirming", res);
      return resp.json(res);
    }

    if (status === "expired") {
      const updated = await don2db.update(payment.order_id, {
        status: "expired",
      });
      console.info("expired", updated);
      return resp.json(updated);
    }

    if (status === "failed") {
      const updated = await handle_failed(payment);
      console.info(`deleted failed payment:${payment.payment_id}`);
      return resp.json(updated);
    }

    const msg_ids = await handle_settled(payment);

    await aws_monitor.send_alert({
      from: `nowpayments-webhook-${stage}`,
      title: "Donation settled",
      body: JSON.stringify(payment),
      fields: [{ name: "message ids", value: JSON.stringify(msg_ids) }],
    });

    return resp.txt("Donation settled");
  } catch (err) {
    await aws_monitor.send_alert({
      from: `nowpayments-webhook-${stage}`,
      title: "Unknown error occured",
      body: JSON.stringify(err, Object.getOwnPropertyNames(err)),
    });

    return resp.err(500, "Unknown error occured");
  }
};
