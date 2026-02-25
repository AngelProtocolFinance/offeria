import { send_email } from "@/helpers/email";
import { donation_microdeposit_action as email } from "@better-giving/react-emails";
import type Stripe from "stripe";
import { str_id } from "#/helpers/stripe";
import { ses } from "../../../kit/ses";
import { stripe } from "../../../kit/stripe";
import { don2db } from "../../../tables/donations";

type Intent = Stripe.PaymentIntent | Stripe.SetupIntent;

/**
 * Payment Intent - Updates intent transaction with deposit verification URL, status is still "intent"
 * Setup Intent   - Creates an "intent" donation record with deposit verification URL
 */
export async function handle_intent_requires_action(intent: Intent) {
  if (!intent.metadata) {
    throw new Error(`missing intent metadata for intent:${intent.id}`);
  }
  const verification_link =
    intent.next_action?.verify_with_microdeposits?.hosted_verification_url;

  if (!verification_link) {
    throw new Error(`missing verification link - intent:${intent.id}`);
  }

  const { order_id } = intent.metadata;

  const pm = await stripe.paymentMethods
    .retrieve(str_id(intent.payment_method))
    .then((x) => x.type);
  const don = await don2db.update(order_id, {
    via: `stripe:${pm}`,
    via_extra: verification_link,
    status: "intent",
  });

  const x: email.IData = {
    to_name: don.to_name,
    from_name: don.from_name?.split(" ")[0] ?? "Donor",
    verification_link: verification_link,
  };
  const { node, subject } = email.template(x);

  return send_email(ses, { node, subject, to: [don.from_email] });
}
