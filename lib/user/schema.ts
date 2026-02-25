import * as v from "valibot";
import { $ } from "../schemas";

export const user_update = v.object({
  prefCurrencyCode: v.optional(v.pipe($, v.toLowerCase(), v.minLength(3))),
  givenName: v.optional(v.pipe($, v.minLength(1))),
  familyName: v.optional(v.pipe($, v.minLength(1))),
  avatarUrl: v.optional(v.pipe($, v.url())),
});

export const alert_pref = v.object({
  banking: v.optional(v.boolean()),
  donation: v.optional(v.boolean()),
});

export interface IAlertPref extends v.InferOutput<typeof alert_pref> {}

export interface IUserUpdate extends v.InferOutput<typeof user_update> {}
export interface IUser extends Required<IUserUpdate> {}
export interface IUserDb extends IUser {
  clientID: string;
  /** iso date string */
  signupDate: string;
  hubspotContactID: string;
  walletIndex?: number;
}

export const userxnpo_update = v.object({
  /** for particular endow-id
   *  if no preference, send alert */
  alertPref: v.optional(alert_pref),
});

export interface IUserXNpoUpdate
  extends v.InferOutput<typeof userxnpo_update> {}

export const email = v.pipe($, v.toLowerCase(), v.email());

export const invite = v.object({
  invitee: email,
  inviteeFirstName: v.pipe($, v.minLength(1)),
  invitor: email,
  endowName: v.pipe($, v.minLength(1)),
});

export interface IInviteNew extends v.InferOutput<typeof invite> {}

export interface IUserXNpo extends IUserXNpoUpdate {
  endowID: number;
  email: string;
}

export interface IUserXFund {
  fundId: string;
  email: string;
}
