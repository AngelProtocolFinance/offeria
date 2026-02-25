import { amnt_sum } from "@/donations/helpers";
import { rd2num } from "@/helpers/decimal";
import type { IMetadata } from "@/stripe";
import type { ISub } from "@/subscriptions";
import type Stripe from "stripe";
import { str_id } from "#/helpers/stripe";
import { don2db } from "../../../tables/donations";
import { subsdb } from "../../../tables/subscriptions";

export async function handle_subscription_created({
  object: sub,
}: Stripe.CustomerSubscriptionCreatedEvent.Data) {
  const { order_id } = sub.metadata as IMetadata;

  const order = await don2db.get(order_id);
  if (!order) throw new Error(`Order not found for id:${order_id}`);

  const { price: p } = sub.items.data[0];

  if (!p.recurring) {
    throw new Error(
      `price:${p.id} is not recurring on subscription:${sub.id} price`
    );
  }
  const total = amnt_sum(order.amount);
  const total_usd = total / order.upusd;

  const record: ISub = {
    id: sub.id,
    created_at: sub.created,
    updated_at: sub.created,
    interval: p.recurring.interval,
    interval_count: p.recurring.interval_count,
    next_billing: sub.current_period_end,
    amount: rd2num(total, 0),
    amount_usd: rd2num(total_usd, 0),
    currency: order.currency,
    product_id: str_id(p.product),
    to_type: order.to_type,
    to_id: order.to_id,
    to_name: order.to_name,
    platform: "stripe",
    status: "active",
    env: order.env,
    from_id: order.from_email,
  };

  const res = await subsdb.put(record);
  console.info(`Created subscription record ${sub.id} `, res);
}
