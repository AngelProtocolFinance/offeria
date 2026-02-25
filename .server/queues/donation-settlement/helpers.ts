import type { TxType } from "@/db";
import type { IReferrer } from "@/donations";
import type { INpo } from "@/endowment";
import { referralsdb } from "../../tables/commissions";

export interface ICommissionSource {
  /** npo id */
  id: number;
  amnt: number;
}
export interface IReferrerLtdItem {
  id: string;
  source: ICommissionSource;
}

interface Commission extends IReferrer {
  ltd: IReferrerLtdItem;
  record: TxType["Put"];
}

export const commission_fn = (
  tx: { tip: number; fee: number; id: string },
  npo: INpo
): Commission | null => {
  if (!tx.tip && !tx.fee) return null;
  if (!npo.referrer || !npo.referrer_expiry) return null;
  const is_expired = new Date(npo.referrer_expiry) < new Date();

  if (is_expired) return null;
  const d = new Date().toISOString();
  const amount = tx.fee + tx.tip;

  const record = referralsdb.commission_put_txi({
    date: d,
    referrer: npo.referrer,
    donation_id: tx.id,
    npo: npo.id,
    amount,
    env: referralsdb.env,
    status: "pending",
  });

  const source: ICommissionSource = { id: npo.id, amnt: amount };
  return {
    id: npo.referrer,
    cf_from_tip: tx.tip,
    cf_from_fee: tx.fee,
    ltd: { id: npo.referrer, source },
    record,
  };
};

export const ltd_by_referrer = (items: IReferrerLtdItem[]) => {
  return items.reduce(
    (acc, curr) => {
      acc[curr.id] ||= [];
      acc[curr.id].push(curr.source);
      return acc;
    },
    {} as Record<string, ICommissionSource[]>
  );
};

export const referrer_ltd_update_txi = (
  referrer: string,
  sources: ICommissionSource[]
): TxType["Update"] => {
  const names: Record<string, string> = { "#referrer": "referrer" };
  const values: Record<string, unknown> = {
    ":zero": 0,
    ":referrer": referrer,
  };

  const sets = sources.map((source, index) => {
    const alias = `#amount${source.id}`;
    const placeholder = `:amount${index}`;
    names[alias] = `#${source.id}`;
    values[placeholder] = source.amnt;
    return `${alias} = if_not_exists(${alias}, :zero) + ${placeholder}`;
  });

  return {
    TableName: referralsdb.table,
    Key: referralsdb.key_ltd(referrer),
    UpdateExpression: `SET ${sets.join(", ")}, #referrer = :referrer`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  };
};
