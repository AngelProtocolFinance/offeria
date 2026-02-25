import crypto from "node:crypto";
import type { ChariotMetadata, ISettlement } from "@/donations";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { nvs } from "../../env";
import { chariot } from "../../kit/chariot";
import { to_q_don_settled, to_q_don_success } from "../../queues/helpers";
import { don2db } from "../../tables/donations";
import { resp } from "../resp";

export const index: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const sig = event.headers["chariot-webhook-signature"];
    const body = event.body ?? "";

    if (!sig) return resp.err(403, "missig signature header");

    // verify received payload
    const timestamp = sig.match(/[^t=]*\Z/g)![0];
    const sig_hash = sig.split("v1=")[1];

    const signed = `${timestamp}.${body}`;
    const hash = crypto
      .createHmac("sha256", nvs.chariot.signing_key)
      .update(signed)
      .digest("hex");

    if (hash !== sig_hash) return resp.status(201);

    const payload = JSON.parse(body);
    // https://docs.givechariot.com/api/webhooks
    const grant = await chariot.get_grant(payload.associated_object_id);
    console.info(payload, grant);
    const { don_id } = grant.metadata as unknown as ChariotMetadata;

    if (grant.status === "Canceled") {
      await don2db.update(don_id, { status: "cancelled" });
      console.info(`chariot grant:${don_id} cancelled and deleted`);
      return resp.status(202);
    }

    if (grant.status !== "Completed") {
      console.info(`${don_id} status:${grant.status}`);
      // avoid retry
      return resp.status(203);
    }

    const gross = grant.amount / 100;
    const fee = (grant.feeDetail?.total ?? 0) / 100;

    const settlement: ISettlement = {
      date: new Date().toISOString(),
      net: gross - fee,
      fee,
      id: grant.id,
      currency: "USD",
    };

    const order = await don2db.update(grant.id, {
      status: "settled",
      settlement,
    });

    const msg_id_1 = await to_q_don_success(order);
    const msg_id_2 = await to_q_don_settled(order);
    return resp.json({ msg_id_1, msg_id_2 });
  } catch (err) {
    console.error(err);
    return resp.err(500, "something went wrong");
  }
};
