import type { Except } from "type-fest";
import type { Ensure } from "#/types/utils";
import type { Environment, TFrequency } from "../schemas";
import type { IPageKeyed } from "../types/api";
import type { IAmount, IProgram, ITribute } from "./schema";

export type TToType = "npo" | "fund";

export type TDonationSource = "bg-marketplace" | "bg-widget";

export interface ITo {
  /** npo:int, fund:uuid */
  to_id: string;
  to_name: string;
  to_type: TToType;
  to_tip_allowed: boolean;
  /** further distribution e.g. fund npos - number[] */
  to_members: string[];
}

export interface IFromLegacyOrPostDonation {
  /** @legacy */
  from_wallet_addr?: string;
  /** appears in npo profile */
  from_public_msg_to_npo?: string;
  /** whether donor appears on npo profile  */
  from_public?: boolean;
  from_private_msg_to_npo?: string;
}

export interface IFrom {
  from_email: string;
  from_name?: string;
  from_title?: string;
  from_company_name?: string;
  from_addr_street?: string;
  from_addr_city?: string;
  from_addr_state?: string;
  from_addr_zip_code?: string;
  from_addr_country?: string;
}

/**
 * "created": created,
 * "intent":  payment initiated, not yet confirmed
 * "expired": intent expired without confirmation
 * "confirmed": confirmed by payment processor, not yet settled
 * "settled"
 * "failed"
 * "cancelled"
 */
export type TStatus =
  | "created"
  | "intent"
  | "expired"
  | "confirmed"
  | "settled"
  | "failed"
  | "cancelled";

export interface ISettlement {
  id: string;
  date: string;
  /** e.g. USD, USDC*/
  currency: string;
  net: number;
  fee: number;
}

export interface IReferrer {
  id: string;
  cf_from_tip: number;
  cf_from_fee: number;
}

/** fees further applied on settled amount */
export interface IDistFees {
  base: number;
  fsa: number;
}

export interface IParent {
  id: string;
  to_id: string;
  to_name: string;
  to_members: string[];
}

export interface IFees extends IDistFees {
  processing: number;
}

export interface IAllocation {
  liq: number;
  lock: number;
  cash: number;
}

export interface IToSettings {
  fiscal_sponsored: boolean;
  alloc: IAllocation;
}

export interface IDonationDist {
  id: string;
  /** currency of amounts in this interface */
  currency: string;
  gross: number;
  net: number;
  fees: IFees;
  fee_allowance: number;
  fee_allowance_excess: number;
  referrer?: IReferrer;
  form_tag?: string;
  to_settings: IToSettings;
  parent?: IParent;
}

export interface IDonation extends ITo, IFrom, IFromLegacyOrPostDonation {
  /** ulid */
  id: string;
  /** from migrations */
  id_v1?: string;
  /** unit of amount.currency per usd */
  upusd: number;
  env: Environment;
  status: TStatus;

  /** for settlement records,  */
  created_at: string;
  updated_at: string;

  amount: IAmount;
  /** uppercase */
  currency: string;
  program?: IProgram;
  source: TDonationSource | (string & {});
  /** form id if using new form */
  source_id?: string;
  frequency: TFrequency;

  /** {processor}:{pm_id} e.g. stripe:card, stripe:link */
  via: string;
  /** chariot - grant id, np - payment id, stripe - verification url */
  via_extra?: string;
  /**
   * for recurring: if this record is already settled (first time, or one-time), create new id
   * not present for derived records (e.g. tip record, npo record created from fund record)
   * */
  settlement?: ISettlement;

  /** present on derived records (e.g. tip, npo derived from fund) */
  dist?: IDonationDist;

  //misc
  tribute?: ITribute;
}

export interface IDonationSettled extends Ensure<IDonation, "settlement"> {}

export interface IDonationUpdate
  extends Partial<Except<IDonation, "id" | "created_at" | "updated_at">> {}

export interface IDonsFromPage extends IPageKeyed<IDonation> {}
export interface IDonsFromOpts {
  limit?: number;
  next?: string;
  status?: TStatus;
}

export interface ChariotMetadata {
  /** ulid */
  don_id: string;
  amount: IAmount;
}
