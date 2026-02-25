import type { TRecord } from "@/db";
import type { IBapp, IPriorityNums } from "./interfaces";

export function to_pn(gsi4SK: string): number {
  const [this_pn] = gsi4SK.split("#");
  return +this_pn;
}
export function to_bapp(record: TRecord, pns?: IPriorityNums): IBapp {
  const {
    PK,
    gsi1PK,
    gsi1SK,
    gsi2PK,
    gsi2SK,
    gsi3PK,
    gsi3SK,
    gsi4PK,
    gsi4SK,
    ...r
  } = record;
  const [, status, date_created] = gsi1SK.split("#");
  const this_pn = to_pn(gsi4SK);

  return {
    top_pn: pns?.top,
    heir_pn: pns?.heir,
    this_pn: +this_pn,
    id: r.wiseRecipientID,
    npo_id: r.endowmentID,
    date_created,
    status,
    bank_summary: r.bankSummary,
    bank_statement_file: r.bankStatementFile,
    rejection_reason: r.rejectionReason,
  };
}
