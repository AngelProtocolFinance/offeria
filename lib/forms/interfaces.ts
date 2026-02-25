import type {
  DonateMethodId,
  Environment,
  IIncrement,
  TFrequency,
} from "../schemas";
import type { IPageKeyed } from "../types/api";

export interface IProgram {
  id: string; //uuid
  name: string;
}

export interface IDefault {
  amount_usd: string;
}

export interface IForm {
  /** nanoid */
  id: string;
  env: Environment;
  /** iso */
  date_created: string;
  tag: string;
  name: string;
  /** default: bg-primary */
  accent_primary?: string;
  /** default: bg-secondary */
  accent_secondary?: string;
  /** all active, when not defined */
  donate_methods?: DonateMethodId[];
  /** defaults when undefined */
  increments?: IIncrement[];
  freq_opts?: TFrequency[];
  /** "smart", number - fixed */
  target: "smart" | number | null; //
  /** npo_id, email */
  owner: string;
  /** uuid:fundraiser, num:nonprofit */
  recipient: string;
  recipient_type: "npo" | (string & {}); //future
  /** received ltd in usd  */
  ltd: number;
  ltd_count: number;
  program?: IProgram;

  defaults?: {
    stripe?: IDefault;
  };
  /** url */
  success_redirect?: string;
  status: "active" | "inactive";
}

export interface IOwnerFormsPage extends IPageKeyed<IForm> {}
export interface IOwnerFormsPageOpts {
  limit?: number;
  next?: string;
}
