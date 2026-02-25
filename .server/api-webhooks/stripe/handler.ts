import type { ISubUpdate } from "@/subscriptions";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getUnixTime } from "date-fns";
import { nvs } from "../../env";
import { fiat_monitor } from "../../kit/discord";
import { stripe } from "../../kit/stripe";
import { subsdb } from "../../tables/subscriptions";
import { resp } from "../resp";
import {
  handle_intent_failed,
  handle_intent_requires_action,
  handle_setup_intent_failed,
  handle_setup_intent_succeeded,
} from "./handlers";
import { handle_intent_succeeded } from "./handlers/intent-suceeded";
import { handle_subscription_created } from "./handlers/subscription-created";

/**
 * Webhook signing logic inspired by stripe-node,
 * @see {@link https://github.com/stripe/stripe-node/blob/master/examples/webhook-signing/nextjs/app/api/webhooks/route.ts}
 */
export const index: APIGatewayProxyHandlerV2 = async (event) => {
  const signature = event.headers["stripe-signature"];
  if (!signature) return resp.err(403, "missing signature header");

  const stripe_event = stripe.webhooks.constructEvent(
    event.body ?? "",
    signature,
    nvs.stripe.webhook_secret
  );

  try {
    switch (stripe_event.type) {
      case "payment_intent.succeeded":
        await handle_intent_succeeded(stripe_event.data);
        break;
      case "setup_intent.succeeded":
        await handle_setup_intent_succeeded(stripe_event.data);
        break;
      case "payment_intent.payment_failed":
        await handle_intent_failed(stripe_event.data);
        break;
      case "setup_intent.setup_failed":
        await handle_setup_intent_failed(stripe_event.data);
        break;
      case "payment_intent.requires_action":
      case "setup_intent.requires_action":
        if (
          stripe_event.data.object.next_action?.type !==
          "verify_with_microdeposits"
        ) {
          return resp.txt(
            `requires_action next action type not supported: ${stripe_event.type}`,
            201
          );
        }
        await handle_intent_requires_action(stripe_event.data.object);
        break;
      case "customer.subscription.created": {
        await handle_subscription_created(stripe_event.data);
        break;
      }
      case "customer.subscription.updated": {
        const { object: sub } = stripe_event.data;
        const update: ISubUpdate = {
          next_billing: sub.current_period_end,
          updated_at: getUnixTime(new Date()),
          status: sub.status === "active" ? "active" : "inactive",
        };
        await subsdb.update(sub.id, update);
        console.info(
          `Updated subscription ${sub.id} next_billing to ${sub.current_period_end}`
        );
        break;
      }
      default:
        return resp.txt(`Unhandled event type: ${stripe_event.type}`, 201);
    }

    return resp.txt("Received", 200);
  } catch (err) {
    const error_message =
      err instanceof Error
        ? err.message
        : JSON.stringify(err, Object.getOwnPropertyNames(err));
    await fiat_monitor.send_alert({
      type: "ERROR",
      from: `stripe-event-handler-${nvs.app.env}`,
      title: "Stripe Event Processing",
      body: error_message,
    });
    return resp.txt(error_message, 400);
  }
};
