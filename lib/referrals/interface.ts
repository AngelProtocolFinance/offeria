import type { Environment } from "../types/list";

export type TStatus = "pending" | "paid";

export interface ICommission {
  /** iso timestamp */
  date: string;
  referrer: string;
  donation_id: string;
  /** nonprofit id */
  npo: number;
  /** combined from various sources */
  amount: number;
  status: "paid" | "pending";
  env: Environment;
}
/** invidual npo aggregtes #{npo-id} */
export interface ILtd extends Record<`#${number}`, string> {
  referrer: string;
}

export interface IPayout {
  /**wise quote uuid */
  id: string;
  date: string;
  amount: number;
  referrer: string;
  // either error or transfer_id
  error?: string;
  transfer_id?: number;
}

export interface IPayoutLtd {
  amount: number;
}
