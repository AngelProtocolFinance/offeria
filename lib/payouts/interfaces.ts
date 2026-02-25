import type { IPageKeyed } from "../types/api";

export interface IErrorStatus {
  type: "error";
  message: string;
}

export interface ISettledStatus {
  type: "settled";
  settled_date: string;
  settled_id: string;
}
export interface IPendingStatus {
  type: "pending";
}

export type PayoutStatus = IErrorStatus | ISettledStatus | IPendingStatus;

/**
 * donation - a payout from a donation
 * liq - withdraw from savings
 * lock - withdraw from investments
 */
export type TSource = "donation" | "liq" | "lock";

export type IPayout<T extends PayoutStatus = PayoutStatus> = {
  id: string;
  source_id: string;
  recipient_id: string;
  source: TSource;
  /** date created */
  date: string;
  amount: number;
} & T;

export type IPayoutUpdate<T extends PayoutStatus> = Partial<
  Omit<IPayout<T>, "id">
>;

export interface INpoPayoutsOptions {
  next?: string;
  status?: PayoutStatus["type"];
  limit?: number;
}

export interface INpoSettlementsOptions {
  next?: string;
  limit?: number;
}
export interface INpoPayoutsPage extends IPageKeyed<IPayout> {}

export interface ISettlement {
  /** transfer id */
  id: string;
  other_id: string;
  /** npo id */
  recipient_id: string;
  date: string;
  amount: number;
  sources: string[];
  /** https://docs.wise.com/api-docs/api-reference/transfer */
  status: string;
}

export interface ISettlementUpdate extends Partial<Omit<ISettlement, "id">> {}

export interface INpoSettlementsPage extends IPageKeyed<ISettlement> {}
