import { send_email } from "@/helpers/email";
import type { IMetadata } from "@/stripe";
import { donation_error as email } from "@better-giving/react-emails";
import type Stripe from "stripe";
import { str_id } from "#/helpers/stripe";
import { ses } from "../../../kit/ses";
import { stripe } from "../../../kit/stripe";

/** sends an email to donor as to why the payment failed */
export async function handle_intent_failed(
  data: Stripe.PaymentIntentPaymentFailedEvent.Data
) {
  const err = data.object.last_payment_error;
  if (err?.type === "card_error") return; // already handled in frontend
  const meta = await (async (pi) => {
    // subs pi metadata is empty object // retrieve from invoice
    if (Object.keys(pi.metadata).length === 0) {
      if (!pi.invoice) throw "missing invoice";
      const { subscription_details } = await stripe.invoices.retrieve(
        str_id(pi.invoice)
      );
      const m = subscription_details?.metadata as IMetadata | null;
      if (!m) throw "missing invoice metadata";
      return m;
    }
    return pi.metadata as unknown as IMetadata;
  })(data.object);

  const x: email.IData = {
    recipient_name: meta.charityName,
    donor_first_name: meta.fullName.split(" ")[0],
    error_message: `Payment Intent ID ${data.object.id} failed due to: ${
      err?.message ?? "Stripe error"
    }`,
  };
  const { node, subject } = email.template(x);

  await send_email(ses, { node, subject, to: [meta.email] });
}
