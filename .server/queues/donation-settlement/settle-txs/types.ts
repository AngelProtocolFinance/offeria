import type { IDonationFinalAttr } from "@/donation";
import type { IDonation } from "@/donations";
import type { IAllocation } from "@/endowment";

export type Base = Pick<
  IDonationFinalAttr,
  | "transactionDate"
  | "network"
  | "isRecurring"
  | "frequency"
  | "denomination"
  //via
  | "appUsed"
  | "chainId"
  | "chainName"
  | "fiatRamp"
  | "paymentMethod"
  | "form_id"
  | "form_tag"
  //to
  | "programId"
  | "programName"

  //from
  | "donor_public"
  | "donor_message"
  | "email"
  | "title"
  | "fullName"
  | "streetAddress"
  | "state"
  | "city"
  | "country"
  | "zipCode"
  | "company_name"

  //tribute
  | "inHonorOf"
  | "tributeNotif"

  // settlement
  | "destinationChainId"
  | "donationFinalChainId"
  | "donationFinalDenom"
  | "donationFinalTxDate"
  | "donationFinalTxHash"
>;

export interface IUniques
  extends Pick<
    IDonation,
    | "amount"
    | "created_at"
    | "id"
    | "settlement"
    | "to_id"
    | "to_name"
    | "to_members"
    | "to_tip_allowed"
    | "to_type"
  > {}

export interface IBase extends Omit<IDonation, keyof IUniques> {}

export interface Overrides {
  input: number;
  inputUsd: number;
  /** usd, net of processing fee */
  settled: number;
  /** usd, net of bg fees fsa, base */
  net: number;
  /** usd */
  feeAllowance: number;
  /** usd */
  excessFeeAllowance: number;
  referrer?: {
    id: string;
    commission: IDonationFinalAttr["referrer_commission"];
  };
  /** usd */
  fees: {
    base: number;
    processing: number;
    fsa: number;
  };
  txId: string;
  /** exclusive for tips */
  parentTx?: string;

  /** exclusive for donations originating from fundraiser */
  fundTx?: string;
  fundId?: string;
  fundName?: string;

  endowId: number;
  endowName: string;
  claimed: boolean;
  fiscal_sponsored: boolean;
  msg_to_npo?: string;
  allocation: IAllocation;
  receipt_msg: string | undefined;
}
