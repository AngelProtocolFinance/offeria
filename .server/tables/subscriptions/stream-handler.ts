import { to_payload } from "@/helpers/stream";
import type { ISub } from "@/subscriptions";
import type { DynamoDBStreamHandler } from "aws-lambda";
import { paypal } from "../../kit/paypal";
import { stripe } from "../../kit/stripe";

export const index: DynamoDBStreamHandler = async (event) => {
  for (const record of event.Records) {
    const payload = to_payload<ISub>(record);
    if (!payload) continue;

    console.info(payload);

    if (payload.type === "modify") {
      if (
        payload.prev.status === "active" &&
        payload.curr.status === "inactive"
      ) {
        if (payload.curr.platform === "stripe") {
          await stripe.subscriptions.cancel(payload.curr.id, {
            cancellation_details: {
              comment: payload.curr.status_cancel_reason,
            },
          });
          console.info(`subscription ${payload.curr.id} cancelled on stripe`);
        } else if (payload.curr.platform === "paypal") {
          await paypal.cancel_subscription(payload.curr.id, {
            reason: payload.curr.status_cancel_reason ?? "no reason provided",
          });
          console.info(`subscription ${payload.curr.id} cancelled on paypal`);
        }
      }
    }
  }
};
