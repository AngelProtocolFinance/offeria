import {
  url,
  type InferOutput,
  array,
  boolean,
  integer,
  isoTimestamp,
  maxLength,
  minValue,
  nonEmpty,
  number,
  object,
  optional,
  partial,
  pick,
  pipe,
  transform,
  uuid,
} from "valibot";
import {
  $,
  $int_gte1,
  MAX_NUM_INCREMENTS,
  increment,
  slug,
  target,
} from "../schemas";

export { type DonateMethodId, slug } from "../schemas";
export type { Environment } from "../types/list";

export const fund_id = pipe($, uuid());
/**
 * when fundraiser is created in the context of an NPO, all members of that NPO can edit the fundraiser
 * 0 - none
 */
export const npo_owner = pipe(number(), integer(), minValue(0));

export const fund_new = object({
  name: pipe($, nonEmpty("required")),
  description: pipe($, nonEmpty("required")),
  banner: pipe($, url()),
  logo: pipe($, url()),
  /** endowment ids */
  members: pipe(
    array(pipe(number(), integer(), minValue(1))),
    nonEmpty(),
    maxLength(10)
  ),
  featured: boolean(),
  expiration: optional(
    pipe(
      $,
      isoTimestamp("invalid date"),
      minValue(new Date().toISOString()) //created each parsing
    )
  ),
  /** `"0"` - none, {"number"} = fixed */
  target: target,
  videos: array(pipe($, url())),
  increments: optional(
    pipe(
      array(increment),
      maxLength(
        MAX_NUM_INCREMENTS,
        ({ requirement }) => `cannot have more than ${requirement} increments`
      )
    )
  ),
  npo_owner,
  slug: optional(slug),
});

export const fund_update = partial(
  pick(fund_new, [
    "name",
    "description",
    "banner",
    "logo",
    "featured",
    "target",
    "videos",
    "slug",
    "increments",
  ])
);

export const funds_search = object({
  /** search text */
  query: optional($),
  /** input str: from url */
  page: optional($int_gte1),
});

export const funds_npo_memberof_search = object({
  /*
   * this endow is the only member (not an index fund),
   * and is approved:
   * either pre-approval in creation (creator has endow credential)
   * or creator has no credential but later npo approved
   *
   * input str: from url
   */
  npo_profile_featured: optional(
    pipe(
      $,
      transform((x) => x === "true"),
      boolean()
    )
  ),
});

export interface IFundNew extends InferOutput<typeof fund_new> {}
export interface IFundUpdate extends InferOutput<typeof fund_update> {}
export interface IFundsSearchObj extends InferOutput<typeof funds_search> {}
export interface IFundsNpoMemberOfSearchObj
  extends InferOutput<typeof funds_npo_memberof_search> {}

export const MAX_EXPIRATION_ISO = "9999-12-31T23:59:59Z";
export const MAX_EXPIRATION_UNIX = 253402300799;
