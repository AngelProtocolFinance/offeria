import type { IDonation, TToType } from "@/donations";
import { via_name } from "@/donations/helpers";

export interface IRow {
  id: string;
  date: string;
  currency: string;
  amount: number;
  amount_usd: number;
  frequency: string;
  to_id: string;
  to_type: TToType;
  to_name: string;
  program_id?: string;
  program_name?: string;
  via: string;
  via_extra?: string;
}

export const to_row = (x: IDonation): IRow => {
  const total = x.amount.base + x.amount.tip + x.amount.fee_allowance;
  const total_usd = total / x.upusd;
  const row: IRow = {
    id: x.id,
    date: x.created_at,
    currency: x.currency,
    amount: total,
    amount_usd: total_usd,
    to_id: x.to_id,
    to_name: x.to_name,
    to_type: x.to_type,
    via: via_name(x.via),
    via_extra: x.via_extra,
    frequency: x.frequency,
    program_id: x.program?.id,
    program_name: x.program?.name,
  };
  return row;
};
