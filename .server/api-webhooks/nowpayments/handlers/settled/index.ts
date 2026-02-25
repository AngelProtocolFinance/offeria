import type { ISettlement } from "@/donations";
import type { NP } from "@/nowpayments/types";
import { tokens_map } from "@better-giving/crypto";
import { np } from "../../../../kit/nowpayments";
import { to_q_don_settled, to_q_don_success } from "../../../../queues/helpers";
import { don2db } from "../../../../tables/donations";

/**
 * fees, outcomes, are all denominated in the same currency
 * settlement currency is USDC ( set in account), regardless of chain
 * fiat equivalents (actual_paid_amount_fiat) in "usd" set in account
 *
 */
export const handle_settled = async (payment: NP.PaymentPayload) => {
  const { usdpu: outcome_usdpu } = await np.estimate(payment.outcome_currency);
  const outcome_token = tokens_map[payment.outcome_currency.toUpperCase()];
  /** all in usd */
  const settlement: ISettlement = {
    id: payment.payment_id.toString(),
    date: new Date().toISOString(),
    net: payment.outcome_amount * outcome_usdpu,
    fee:
      payment.fee.depositFee +
      payment.fee.serviceFee +
      payment.fee.withdrawalFee,
    currency: outcome_token.code,
  };

  const order = await don2db.update(payment.order_id, {
    status: "settled",
    settlement,
  });

  const msg_id_1 = await to_q_don_settled(order);
  const msg_id_2 = await to_q_don_success(order);

  return { msg_id_1, msg_id_2 };
};
