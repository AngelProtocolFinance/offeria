import type { IDonation, ISettlement } from "@/donations";
import type { IMetadata } from "@/stripe";
import { fromUnixTime } from "date-fns";
import type Stripe from "stripe";
import { str_id } from "#/helpers/stripe";
import { stripe } from "../../../kit/stripe";
import { to_q_don_settled, to_q_don_success } from "../../../queues/helpers";
import { don2db } from "../../../tables/donations";
import { payment_method } from "../helpers/payment-method";
import { settled_fn } from "../helpers/settled";

export async function handle_intent_succeeded({
  object: intent,
}: Stripe.PaymentIntentSucceededEvent.Data) {
  //PaymentIntent Event does not have expandable field so we query for PaymentMethod
  // Fetch settled amount and fee
  const [{ fee, net }, pm] = await Promise.all([
    settled_fn(intent.id),
    payment_method(str_id(intent.payment_method)),
  ]);

  const settled: ISettlement = {
    date: fromUnixTime(intent.created).toISOString(),
    fee,
    net,
    currency: "USD",
    id: intent.id,
  };

  if (is_onetime(intent.metadata)) {
    const { order_id } = intent.metadata;

    const don = await don2db.update(order_id, {
      status: "settled",
      settlement: settled,
      via: `stripe:${pm}`,
    });

    const msg_id_1 = await to_q_don_settled(don);
    const msg_id_2 = await to_q_don_success(don);

    console.info(`Final donation record sent:${msg_id_1}, ${msg_id_2}`);

    return { msg_id_1, msg_id_2 };
  }

  const { subscription_details, created } = await stripe.invoices.retrieve(
    str_id(intent.invoice)
  );

  const subs_meta = subscription_details?.metadata;
  if (!subs_meta) throw "missing subs metadata";
  const { order_id } = subs_meta;

  const don = await don2db.update(order_id, {
    via: `stripe:${pm}`,
  });

  const p: IDonation = don.settlement
    ? // if previously settled, create a new record with sale_id, and sttl_record
      {
        ...don,
        id: intent.id,
        created_at: fromUnixTime(created).toISOString(),
        settlement: settled,
      }
    : await don2db.update(order_id, {
        status: "settled",
        settlement: settled,
      });

  const msg_id_2 = await to_q_don_settled(p);
  const msg_id_1 = await to_q_don_success(p);

  console.info(`Final donation record sent:${msg_id_1}, ${msg_id_2}`);
}

function is_onetime(metadata: any): metadata is IMetadata {
  return Object.keys(metadata).length > 0;
}
