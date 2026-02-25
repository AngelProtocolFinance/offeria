import type { IPageKeyed } from "../types/api";
import type {
  IFsaDocs,
  IReg,
  IRegUpdateInternal,
  IRegUpdateables,
} from "./schema";

export interface IRegsPage extends IPageKeyed<IReg> {}

export interface IFsaSigner {
  first_name: string;
  last_name: string;
  /** may be empty */
  role: string;
  email: string;
  org_name: string;
  org_hq_country: string;
  docs: IFsaDocs;
}

export interface IRegUpdateDb extends IRegUpdateables, IRegUpdateInternal {}
