import type { DonateMethodId, Environment } from "../schemas";
import type { IPageKeyed, IPageNumbered } from "../types/api";
import type { IFundNew } from "./schema";

export interface IFundSettings {
  hide_bg_tip: boolean;
  donateMethods?: DonateMethodId[];
}

export interface IFundCreator {
  /** "{number}" - endow id, "{email} - user*/
  creator_id: string;
  creator_name: string;
}

export interface IFundInternal extends IFundCreator {
  /** uuid */
  id: string;
  spam_score?: number;
  created_at?: string;
  env: Environment;
  /** fund can be closed before expiration  */
  active: boolean;
  verified: boolean;
  /** to date received: initialized to `0` */
  donation_total_usd: number;
  settings: IFundSettings;
}

export interface IFund extends IFundNew, IFundInternal {}

/** search doc record */
export interface IFundItem
  extends Pick<
      IFundNew,
      | "name"
      | "description"
      | "logo"
      | "banner"
      | "featured"
      | "members"
      | "target"
    >,
    Pick<
      IFundInternal,
      | "id"
      | "env"
      | "active"
      | "verified"
      | "donation_total_usd"
      | "creator_id"
      | "creator_name"
    > {
  /** Unix timestamp @default - 253402300799 */
  expiration: number;
}

export interface IFundItemsPage extends IPageNumbered<IFundItem> {}
export interface IFundsPageOpts {
  limit?: number;
  next?: string;
}
export interface IFundsPage extends IPageKeyed<IFund> {}
