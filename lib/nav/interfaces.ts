import type { IPageKeyed } from "../types/api";
export type { INpoSeriesOpts, NpoSeriesRange } from "./schemas";

export type {
  IBals,
  IRebalanceTx,
  IRebalancePayload,
  IRebalanceLog,
} from "./schemas";

export interface ITicker {
  /** uppercase ticker */
  id: string;
  qty: number;
  price_date: string;
  price: number;
  /** qty * price */
  value: number;
}

/** ticker: uppercase, ITicker */
export interface IComposition extends Record<string, ITicker> {}

export interface ILog {
  /** rebalance, purchase, redemption */
  reason: string;
  date: string;
  units: number;
  /** usd per unit */
  price: number;
  /** modified by price updator */
  price_updated: string;
  composition: IComposition;
  /** total value of composition */
  value: number;
  /** holder-id, units */
  holders: Record<string, number>;
}

export type TDividendCreditStatus = "pending" | "completed";

export interface IDividendLog {
  amount_usd: number;
  amount_units: number;
  /** matches investments tx record */
  date_created: string;
  id: string;
  per_npo_units: Record<string, number>;
  per_npo_credit_status: Record<string, TDividendCreditStatus>;
}

export interface IDividendSimulComps {
  purchased_units: number;
  /** non zero unit holders only */
  per_npo_units: Record<string, number>;
  /** non zero unit holders only */
  per_npo_usd: Record<string, number>;
  /** non zero unit holders only */
  per_npo_units_status: Record<string, TDividendCreditStatus>;
}

export interface IPage<T> extends IPageKeyed<T> {}
export interface IPageOptions {
  limit?: number;
  /** base64 */
  next?: string;
  fields?: string[];
  consistent?: boolean;
}

export interface ISeries {
  week?: boolean;
  day?: boolean;
}

export interface ISeriesPoint {
  date: string;
  value: number;
  price: number;
  units: number;
}

export type LogRecordFn = <T>(log: ILog, series?: ISeries) => T;
