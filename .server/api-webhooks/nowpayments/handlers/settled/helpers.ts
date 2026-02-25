import { type TxItems, Txs } from "@/db";
import type { IDonationFinal } from "@/donation";
import type { INpo } from "@/endowment";
import type { ICommission } from "@/referrals";
import { referralsdb } from "../../../../tables/commissions";

interface Commission {
  txs: TxItems;
  to: string;
  breakdown: IDonationFinal["referrer_commission"];
}

export const referral_commission_rate = 0.3;

export const commission_fn = (
  tx: { tip: number; fee: number; id: string },
  endow: INpo
): Commission | null => {
  if (!endow.referrer || !endow.referrer_expiry) return null;
  const is_expired = new Date(endow.referrer_expiry) < new Date();

  if (is_expired) return null;
  const txs = new Txs();
  const d = new Date().toISOString();
  const amount = tx.fee + tx.tip;

  const r: ICommission = {
    date: d,
    referrer: endow.referrer,
    donation_id: tx.id,
    npo: endow.id,
    amount,
    env: referralsdb.env,
    status: "pending",
  };

  txs.put(referralsdb.commission_put_txi(r));
  txs.update(referralsdb.ltd_inc_txi(endow.referrer, endow.id, amount));

  return {
    to: endow.referrer,
    txs: txs.all,
    breakdown: {
      from_tip: tx.tip,
      from_fee: tx.fee,
    },
  };
};
