import type { TFrequency } from "../schemas";
import type { Environment } from "../types/list";
import type { IAllocation, TDonationSource, TDonorTitle } from "./schema";

export interface IReferrerCommission {
  from_tip: number;
  from_fee: number;
  /** exist when paid */
  transfer_id?: number;
}

export interface ITributeNotif {
  toEmail: string;
  toFullName: string;
  fromMsg: string;
}

export type TFiatRamp = "STRIPE" | "CHARIOT" | "PAYPAL";
export type TOnHoldStatus = "intent" | "pending";

export type TDonationOnholdStatus = "intent" | "pending";

export interface IDonationOnHoldAttrLegacy {
  /** @deprecated */
  apesComplianceReviewStatus?: "approved";
  /** @deprecated */
  apesComplianceTimeWindow?: string;
  /** @deprecated */
  client?: "apes";
  /** @deprecated */
  destinationChainId?: "fiat" | "137";
  /** @deprecated */
  donationFinalized?: false;
  /** @deprecated 1-100 str */
  splitLiq?: string;
  /** @deprecated - no more inhouse pipeline */
  third_party?: boolean;
}

export interface IDonationOnHoldAttr {
  transactionDate: string;
  transactionId: string;
  status: TOnHoldStatus;
  network: Environment;
  /** TTL attribute */
  expireAt?: number;

  amount: number;
  feeAllowance?: number;
  tipAmount: number;
  usdValue: number;
  allocation?: IAllocation;
  /**  
  "USD", "TRX", "karate-295", "BRL", "GBP", "USDC", "JPY", "ETH", "USDCMATIC", "EUR", "INR", "THB", "PHP",
  "XRP", "RUB", "CAD", "karate-1" ... */
  denomination: string;
  /** @legacy */
  isRecurring?: boolean;
  frequency?: TFrequency;

  /// FROM ///
  title?: TDonorTitle;
  fullName: string;
  /** may be empty */
  company_name?: string;
  donor_message?: string;
  donor_public?: boolean;
  kycEmail: string;
  /** @legacy */
  email?: string;
  msg_to_npo?: string;
  ukGiftAid?: boolean;
  /** may be empty */
  walletAddress?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;

  /// TO ///
  /** 0 when donating to fund */
  endowmentId: number;
  charityName: string;
  claimed?: boolean;
  fiscalSponsored: boolean;
  /** may be empty, if donation is to npo */
  fund_id?: string;
  fund_members?: number[];
  fund_name?: string;
  hideBgTip?: boolean;
  /** may be empty */
  programId?: string;
  /** may be empty */
  programName?: string;
  /** may be empty */
  nonProfitMsg?: string;

  /// VIA ///
  fiatRamp?: TFiatRamp;
  /** bg-marketplace | bg-widget */
  appUsed: TDonationSource;
  /** nanoid */
  form_id?: string;
  /** "fiat", "trx", "hbar", "eth", "matic", "xrp-mainnet" */
  chainId: string;
  /** "Fiat", "TRON", "Hedera", "Ethereum", "", "Polygon", "Stripe", "XRP Ledger" */
  chainName: string;
  /** Nowpayments: number, custom: uuid */
  payment_id?: number | string;
  /** e.g. Bank transfer */
  paymentMethod?: string;
  stripeDepositVerifyUrl?: string;

  /// TRIBUTE ///
  /** may be empty */
  inHonorOf?: string;
  tributeNotif?: ITributeNotif;
  /** @ignore - for migration purposes */
  migration?: string;
}

export interface IDonationOnholdUpdate
  extends Partial<Omit<IDonationOnHoldAttr, "transactionId">> {}

export interface IDonationOnHold
  extends IDonationOnHoldAttr,
    IDonationOnHoldAttrLegacy {}

export interface IDonationFinalAttrLegacy {
  /** @deprecated "", " "*/
  addressComplement?: string;
  /** @deprecated 4 */
  apesComplianceNewRecipient?: 4;
  /** @deprecated "approved", "pending" */
  apesComplianceReviewStatus?: string;
  /** @deprecated */
  apesComplianceTimeWindow?: string;
  /** @deprecated */
  charityId?: string | number;
  /** @deprecated */
  checked8283?: "no" | "yes";
  /** @deprecated */
  client?: "apes" | "normal";
  /** @deprecated */
  consent_marketing?: boolean;
  /** @deprecated */
  consent_tax?: boolean;
  /** @deprecated */
  cryptoFee?: number;
  /** @deprecated - all donations in this table are settled/final */
  donationFinalized?: boolean;
  /** @deprecated */
  fiscalSponsorshipFee?: number;
  /** @deprecated */
  fundDepositTxHash?: string;
  /** @deprecated */
  fundId?: number;
  /** @deprecated */
  fundMembers?: string[];
  /** @deprecated may be empty */
  nftAddress?: string;
  nftRequested?: boolean;
  /** @deprecated */
  receiptRequested?: boolean;
  /** @deprecated */
  splitLiq?: string;
  /** @deprecated "null", "UST", "axlUSDC", "USDC", "nulll"  */
  swapDenomination?: string;
  /** @deprecated */
  swapFinalAmount?: number;
  /** @deprecated */
  swapFinished?: boolean;
  /** @deprecated */
  swapStarted?: boolean;
  /** @deprecated */
  taxReceiptSent?: "yes" | "no";
  /** @deprecated e.g. "White Whale", "Plutos Pot / Lunaverse", "Spaar"..*/
  tcaAssociation?: string;
  /** @deprecated */
  ustFinal?: number;
  /** @deprecated */
  walletAddress?: string;
}

export interface IDonationFinalAttr {
  transactionId: string;
  /** iso */
  transactionDate?: string;
  /** indicates this is a tip record */
  parentTx?: string;
  network?: Environment;
  amount?: number;
  usdValue?: number;
  /** @legacy */
  isRecurring?: boolean;
  frequency?: TFrequency;
  feeAllowance?: number;
  /**
  PHP", "UST", "USD", "LUNA", "ETH", "USDCMATIC", "axlUSDC", "LTC", undefined, "EUR", "NZD", "JUNO", "INR",
  "IDR", "GBP", "USDTMATIC", "PKR", "BTC", "SEK", "HKD", "SGD", "BNB", "CAD", "MATICMAINNET",
  "USDC", "MOP", "XRP", "JPY", "MATIC", "RSD", "ZEC", "TWD", "SOL", "AUD", "KRW", "BCH", "CHF", "TEL", "USDTBSC",
  "YER", "ATOM", "AVAXC", "USDTERC20", "XVG", "BUSD", "SEI", "ICX", "ETHBASE", "USDC.e", "USDCBASE", "TRX",
  "VND", "SZL", "GONE", "AFN", "PLN", "NOK", "WETH", "EGP", "BUSDBSC", "USDCARC20", "USDTTRC20", "THB"
   */
  denomination?: string;
  allocation?: IAllocation;

  /// VIA ///
  /** "bg-marketplace", "restore-earth", "angel-protocol",
  "ukraine-portal", "bg-widget", undefined, "aging", "black-history-month",
  "make-whole", "mental-health", "tester-app" */
  appUsed?: TDonationSource | (string & {});
  /** nanoid | `${number}` - bg form */
  form_id?: string;
  /** form tag at the time of settlement */
  form_tag?: string;
  /**
  "fiat", "columbus-5", "eth", "matic", "juno-1", "ltc", undefined, "btc", "phoenix-1", "56", "1", "137",
  "xrp-mainnet", "zec", "sol", "bch", "bsc", "cchain", "xvg", "xrp", "sei-1", "icx", "base",
  "trx", "avaxc""
   */
  chainId?: string;
  /**
  "Fiat", "Terra Mainnet", "STRIPE", "Ethereum Mainnet",
  "Polygon", "Juno Mainnet", "Litecoin", undefined, "Ethereum", "Bitcoin", "Terra Phoenix Mainnet",
  "Binance Smart Chain", "Polygon Mainnet", "XRP Ledger",
  "Zcash", "Solana", "BNB Smart Chain Mainnet", "Bitcoin Cash",
  "Avalanche C-Chain", "Verge", "XRP", "Sei", "ICON", "Base", "TRON", "CHARIOT"
   */
  chainName?: string;
  fiatRamp?: TFiatRamp;
  /**
  "Credit Card", undefined, "Stripe Link", "Bank Transfer",
  "Crypto", "Debit Card", "link", "Card", "Bank", "crypto", "Amazon Pay", "Daf", "Affirm", "eps", "card",
  "p24", "affirm"
   */
  paymentMethod?: string;

  /// TO ///
  endowmentId?: number;
  charityName?: string;
  claimed?: boolean;
  fiscalSponsored?: boolean;
  fund_id?: string;
  fund_name?: string;
  fund_members?: number[];
  /** may be empty */
  nonProfitMsg?: string;
  /** may be empty */
  programId?: string;
  /** may be empty */
  programName?: string;

  /// FROM ///
  donor_public?: boolean;
  donor_message?: string;
  kycEmail?: string;
  /** @warning, about 14 legacy records (~2021) contain invalid email */
  email?: string;
  msg_to_npo?: string;
  /** Mr Ms Mrs Mx, may be empty */
  title?: string;
  /** may be empty */
  fullName?: string;
  streetAddress?: string;
  state?: string;
  /** @legacy may be empty */
  stateAddress?: string;
  /** may be empty */
  city?: string;
  /** may be empty */
  country?: string;
  /** may be empty */
  zipCode?: string;
  ukGiftAid?: boolean;
  /** may be empty */
  company_name?: string;

  /// TRIBUTE ///
  /** may be empty */
  inHonorOf?: string;
  tributeNotif?: ITributeNotif;

  /// SETTLEMENT ///
  baseFee?: number;
  fiscalSponsorFee?: number;
  processingFee?: number;
  settledUsdAmount?: number;
  donationFinalAmount?: number;
  /** 
  "fiat", undefined, "matic", "137", "noble-1", "eth"*/
  destinationChainId?: string;
  /** "fiat", undefined, "matic", "juno-1", "137", "noble-1", "eth" */
  donationFinalChainId?: string;
  /**
   * "USD", "aUSDC", "USDC", "axlUSDC"
   */
  donationFinalDenom?: string;
  /** iso date */
  donationFinalTxDate?: string;
  excessFeeAllowanceUsd?: number;
  donationFinalTxHash?: string;

  /// REFERRALS ///
  referrer_commission?: IReferrerCommission;
  referrer?: string;

  /// OTHERS ///
  taxReceiptId?: string;
  /** e.g. crypto:tron, stripe:card */
  via?: string;
  /** @ignore - for migration purposes */
  migration?: string;
}

export interface IDonationFinalUpdate
  extends Partial<Omit<IDonationFinalAttr, "transactionId">> {}

export interface IDonationFinal
  extends IDonationFinalAttr,
    IDonationFinalAttrLegacy {}

export interface IPublicDonor {
  amount: number;
  /** iso */
  date: string;
  donation_id: string;
  donor_id: string;
  donor_message: string;
  donor_name: string;
  env: Environment;
  /** uuidv4 */
  id: string;
  /** Endow or fund ID */
  recipient_id: string;
}

export interface ISubscription {
  //PK
  subscription_id: string;
  app_used: string;
  charity_name: string;
  customer_id: string;
  email: string;
  endowment_id: number;
  fiat_ramp: "STRIPE";
  fiscal_sponsored: boolean;
  hide_bg_tip: boolean;
  /** url*/
  latest_invoice?: string;
  network: Environment;
  product_id: string;
  /**
   * Determines overall price the user has to pay
   * For example, we have a recurring subscription plan of $1 per month.
   * If quantity is set to 2 then the user pays $2 per month
   */
  quantity: number;
  split_liq: string;
  /** @link https://docs.stripe.com/billing/subscriptions/overview#payment-status */
  status: "active" | "incomplete";
}
