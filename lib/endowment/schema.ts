import {
  $,
  $int_gte1,
  $req,
  MAX_NUM_INCREMENTS,
  donate_freq_opts,
  donate_method_id,
  env,
  https_url,
  increment,
  int_gte1,
  org_designation,
  slug,
  target,
  unsdg_num,
} from "../schemas";
export {
  $,
  $req,
  $req_num_gt0,
  donate_method_id,
  env,
  https_url,
  int_gte1,
  $int_gte1,
  org_designation,
  slug,
  unsdg_num,
} from "../schemas";
import * as v from "valibot";

export const min_payout_amount = 50;

/** used for text to give */
export const keyword = v.pipe(
  $,
  v.nonEmpty("required"),
  v.toLowerCase(),
  v.maxLength(10, ({ requirement: r }) => `max ${r} characters`),
  v.regex(/^[a-z]+$/, "must be letters only")
);

export const csv = v.lazy((x) => {
  if (!x) return $;
  return v.pipe($, v.regex(/^[^,]+(?:,[^,]+)*$/, "invalid csv"));
});
export const csv_strs = v.pipe(
  csv,
  v.transform((x) => x.split(",")),
  v.filterItems((x) => x.length > 0)
);

const pct = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100));
export const allocation = v.pipe(
  v.object({
    cash: pct,
    liq: pct,
    lock: pct,
  }),
  v.check((x) => x.cash + x.liq + x.lock === 100, "must total to 100")
);

export interface IAllocation extends v.InferOutput<typeof allocation> {}

export const reg_number = v.pipe(
  $,
  v.nonEmpty("required"),
  v.regex(/^[a-zA-Z0-9]+$/, "must only contain letters and numbers")
);
export const _url = v.pipe($, v.url());

export const social_media_urls = v.object({
  facebook: v.optional(https_url({})),
  twitter: v.optional(https_url({})),
  linkedin: v.optional(https_url({})),
  discord: v.optional(https_url({})),
  instagram: v.optional(https_url({})),
  youtube: v.optional(https_url({})),
  tiktok: v.optional(https_url({})),
});

export interface ISocialMediaURLs
  extends v.InferOutput<typeof social_media_urls> {}

export const MAX_RECEIPT_MSG_CHAR = 500;

export const tagline_max_chars = 140;

export const npo = v.object({
  id: int_gte1,
  env,
  slug: v.optional(slug),
  keyword: v.optional(keyword),
  registration_number: reg_number,
  name: $req,
  endow_designation: org_designation,
  overview: v.optional($),
  tagline: v.optional(v.pipe($, v.maxLength(tagline_max_chars))),
  image: v.optional(_url),
  logo: v.optional(_url),
  card_img: v.optional(_url),
  hq_country: $req,
  active_in_countries: v.pipe(v.array($), v.nonEmpty("required")),
  street_address: v.optional($),
  social_media_urls,
  /** website */
  url: v.optional(https_url({})),
  sdgs: v.pipe(v.array(unsdg_num), v.minLength(1)),
  receiptMsg: v.optional(v.pipe($, v.maxLength(MAX_RECEIPT_MSG_CHAR))),
  //can be optional, default false and need not be explicit
  hide_bg_tip: v.optional(v.boolean()),
  published: v.optional(v.boolean()),
  /** allowed by default */
  progDonationsAllowed: v.optional(v.boolean()),

  allocation: v.optional(allocation),
  donateMethods: v.optional(v.array(donate_method_id)),
  donate_frequencies: v.optional(donate_freq_opts),
  increments: v.optional(
    v.pipe(
      v.array(increment),
      v.maxLength(
        MAX_NUM_INCREMENTS,
        ({ requirement }) => `cannot have more than ${requirement} increments`
      )
    )
  ),
  fund_opt_in: v.optional(v.boolean()),
  target: v.optional(target),
  /** endowment is not claimed if `false` only */
  claimed: v.boolean(),
  kyc_donors_only: v.boolean(),
  fiscal_sponsored: v.boolean(),
  referral_id: v.optional($req),
  referrer: v.optional($req),
  referrer_expiry: v.optional(v.pipe($, v.isoTimestamp())),
  w_form: v.optional(v.string()),
  payout_minimum: v.optional(v.pipe(v.number(), v.minValue(min_payout_amount))),
  donor_address_required: v.optional(v.boolean()),
});

export const npo_update = v.partial(
  v.omit(npo, ["id", "claimed", "kyc_donors_only", "env", "fiscal_sponsored"])
);

export const npo_fields = v.keyof(npo);
export interface INpo extends v.InferOutput<typeof npo> {}
export interface INpoUpdate extends v.InferOutput<typeof npo_update> {}
export type INpoFields = v.InferOutput<typeof npo_fields>;

/** for ein path, only fields in reg-num/env gsi is available */
export const npo_search = v.object({
  fields: v.optional(v.pipe(csv_strs, v.array(npo_fields))),
});

export interface INposSearch extends v.InferInput<typeof npo_search> {}

const amnt = v.pipe(v.number(), v.minValue(0));
export const program_id = v.pipe($, v.uuid());
export const milestone_id = v.pipe($, v.uuid());

export const milestone_new = v.object({
  date: v.pipe($, v.isoTimestamp()),
  title: $,
  description: $,
  media: v.optional(_url),
});

export const milestone_update = v.partial(milestone_new, ["date"]);
export interface IMilestoneUpdate
  extends v.InferOutput<typeof milestone_update> {}

export interface IMilestoneNew extends v.InferOutput<typeof milestone_new> {}
export const milestone = v.object({
  ...milestone_new.entries,
  id: milestone_id,
});
export interface IMilestone extends v.InferOutput<typeof milestone> {}

export const program_new = v.object({
  title: $,
  description: $,
  banner: v.optional(_url),
  /** null unsets target */
  targetRaise: v.nullish(amnt),
  milestones: v.pipe(v.array(milestone_new), v.maxLength(24)),
});

export const program = v.object({
  ...v.omit(program_new, ["milestones"]).entries,
  /** in USD */
  totalDonations: v.optional(v.number()),
  id: program_id,
});

export const program_update = v.partial(v.omit(program_new, ["milestones"]));

export interface IProgramNew extends v.InferOutput<typeof program_new> {}
export interface IProgramDb extends v.InferOutput<typeof program> {}
export interface IProgram extends v.InferOutput<typeof program> {
  milestones: IMilestone[];
}
export interface IProgramUpdate extends v.InferOutput<typeof program_update> {}

export const media_url = v.pipe($, v.url());
/**
 * so that media is automatically sorted by date
 * @see https://github.com/segmentio/ksuid
 * */
export const media_ksuid = $req; // base62;
export const media_types = ["album", "article", "video"] as const;
export const media_type = v.picklist(media_types);
export type TMediaType = v.InferOutput<typeof media_type>;

export const media_update = v.object({
  url: v.optional(media_url),
  featured: v.optional(v.boolean()),
});
export interface IMediaUpdate extends v.InferOutput<typeof media_update> {}

export const media_search = v.object({
  type: v.optional(media_type),
  next: v.optional(v.pipe($, v.base64())),
  featured: v.optional(
    v.pipe(
      $,
      v.transform((x) => Boolean(x)),
      v.boolean()
    )
  ),
  limit: v.optional($int_gte1),
});
export interface IMediaSearch extends v.InferInput<typeof media_search> {}
export interface IMediaSearchObj extends v.InferOutput<typeof media_search> {}

export const bool_csv = v.pipe(
  csv_strs,
  v.mapItems((x) => x === "true"),
  v.array(v.boolean())
);

export const npo_item = v.object({
  ...v.pick(npo, [
    "card_img",
    "name",
    "tagline",
    "hq_country",
    "sdgs",
    "active_in_countries",
    "endow_designation",
    "registration_number",
    "kyc_donors_only",
    "claimed",
    //filters
    "env",
    "id",
    "published",
    "fund_opt_in",
    "target",
  ]).entries,
  contributions_total: v.number(),
  contributions_count: v.number(),
  doc_id: v.string(/** env-{id} */),
});

export interface INpoItem extends v.InferOutput<typeof npo_item> {}

export const npo_item_fields = v.keyof(npo_item);

export const npos_search = v.object({
  query: v.optional($),
  page: v.optional($int_gte1),
  endow_designation: v.optional(v.pipe(csv_strs, v.array(org_designation))),
  sdgs: v.optional(
    v.pipe(
      csv_strs,
      v.mapItems((x) => +x),
      v.array(unsdg_num)
    )
  ),
  kyc_only: v.optional(bool_csv),
  fund_opt_in: v.optional(bool_csv),
  claimed: v.optional(bool_csv),
  published: v.optional(bool_csv),
  countries: v.optional(v.pipe(csv_strs, v.array($))),
  fields: v.optional(v.pipe(csv_strs, v.array(npo_item_fields))),
});

export interface INposSearch extends v.InferInput<typeof npos_search> {}
export interface INposSearchObj extends v.InferOutput<typeof npos_search> {}
