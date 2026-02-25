import { amnt_sum, partition } from "@/donations/helpers";
import type { NP } from "@/nowpayments/types";
import type { Environment } from "@/schemas";
import { np } from "../../../kit/nowpayments";
import { don2db } from "../../../tables/donations";

export async function handle_confirming(
  payment: NP.PaymentPayload,
  stage: Environment
) {
  const order = await don2db.get(payment.order_id);

  if (!order) throw `Record ${payment.order_id} not found!`;
  /* ** EXTRACT TIP, FEE ALLOWANCE ** */

  const { usdpu } = await np.estimate(payment.pay_currency);

  const total = amnt_sum(order.amount);

  // in staging, use fake amount
  const paid = stage === "production" ? payment.actually_paid : total;

  // proportion tip and fees based on actual paid
  const parts = partition(order.amount);
  const actual = parts(paid);

  const updated = await don2db.update(order.id, {
    status: "confirmed",
    amount: actual,
    currency: order.currency,
    upusd: 1 / usdpu,
  });
  return updated;
}
