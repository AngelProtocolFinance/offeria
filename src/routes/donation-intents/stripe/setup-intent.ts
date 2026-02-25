import { stripe } from "$/kit/stripe";
import type { IMetadata } from "@/stripe";

export async function setup_intent(
  order_id: string,
  customer_id: string
): Promise<string> {
  const { client_secret } = await stripe.setupIntents.create({
    customer: customer_id,
    payment_method_options: {
      acss_debit: {
        currency: "cad",
        mandate_options: {
          interval_description: "Recurring donations",
          payment_schedule: "interval",
          transaction_type: "business",
        },
        verification_method: "automatic",
      },
    },
    metadata: { order_id } satisfies IMetadata,
    usage: "off_session",
    automatic_payment_methods: { enabled: true },
  });

  return client_secret || "invalid client secret";
}
