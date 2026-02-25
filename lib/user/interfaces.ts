import type { Environment } from "../schemas";
import type { IAlertPref, IInviteNew } from "./schema";

export interface IInvite extends IInviteNew {
  expireAt: number;
  env: Environment;
}

export interface IUserBookmark {
  email: string;
  endowID: number;
}

export interface INpoAdmin {
  email: string;
  familyName: string;
  givenName: string;
}

export interface IUserNpo {
  id: number;
  alert_pref?: IAlertPref;
}
