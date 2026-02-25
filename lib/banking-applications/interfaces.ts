import type { FileObject } from "../schemas";
import type { IPageKeyed } from "../types/api";
import type { TStatus } from "./schema";

export interface IBapp {
  /** wise recipient id */
  id: string;
  npo_id: number;
  bank_summary: string;
  bank_statement_file: FileObject;
  /** iso */
  date_created: string;
  status: TStatus;
  top_pn?: number;
  heir_pn?: number;
  this_pn: number;
  /** maybe empty */
  rejection_reason: string;
}

export interface IBappsPage extends IPageKeyed<IBapp> {}

export interface IBappsOpts {
  status?: TStatus;
  next?: string;
  limit?: number;
}

export interface IPriorityNums {
  top?: number;
  heir?: number;
}
