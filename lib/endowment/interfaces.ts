import type { IPageKeyed } from "../types/api";
import type { Ensure } from "../types/utils";
import type { IMediaUpdate, INpo, INpoItem, TMediaType } from "./schema";

export {
  type OrgDesignation as EndowDesignation,
  type Environment,
  type UnSdgNum,
  type DonateMethodId,
  https_url,
} from "../schemas";

export interface INpoDb extends INpo {
  /** will only be present for unclaimed NPOs */
  updated_at_auto?: string;
  /** in USD @deprecated */
  payout_minimum?: number;
  /** @deprecated */
  splitLiqPct?: number;
  /** @deprecated */
  splitFixed?: boolean;
  /** @deprecated */
  sfCompounded?: boolean;
}

export interface INpoReferredBy
  extends Ensure<INpo, "referrer" | "referrer_expiry"> {}

export interface INpoWithRid extends Ensure<INpo, "referral_id"> {}
export interface INpoWithKeyword extends Ensure<INpo, "keyword"> {}

export interface INpoWithRegNum
  extends Pick<
    INpo,
    "registration_number" | "env" | "claimed" | "name" | "hq_country" | "id"
  > {}

export interface IMedia extends Required<IMediaUpdate> {
  id: string;
  type: Extract<TMediaType, "video">; // only video for now
  dateCreated: string;
}
export interface IMediaDb extends Omit<IMedia, "featured"> {}
export interface IMediaPage extends IPageKeyed<IMedia> {}

export type TNpoDbKeys = keyof INpoDb;
export type TArrayValues<T extends readonly unknown[]> = T[number];
export type TNpoDbProjectedTo<T> = T extends TNpoDbKeys[]
  ? Pick<INpoDb, TArrayValues<T>>
  : INpoDb;

/** 0 - true, 1 - false, 0 is lexicographically first  */
export type TBinFlag = "0" | "1";

export interface INposPage<T extends keyof INpoItem = keyof INpoItem> {
  items: Pick<INpoItem, T>[];
  page: number;
  pages: number;
}
