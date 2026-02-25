import type { IApplication } from "@/banking-applications";
import { to_bapp } from "@/banking-applications/helpers";
import { send_email } from "@/helpers/email";
import { type IModify, to_payload } from "@/helpers/stream";
import { banking } from "@better-giving/react-emails";
import type { DynamoDBStreamHandler } from "aws-lambda";
import { ses } from "../../kit/ses";
import { userdb } from "../users";

export const index: DynamoDBStreamHandler = async ({ Records }) => {
  const p = to_payload<IApplication>(Records[0]);

  try {
    if (!p) return;
    if (p.type === "delete") return;
    const d = p.type === "insert" ? p.data : p.curr;

    const admins = await userdb.npo_admins(d.endowmentID);
    //at least one of image is present
    if (admins.length === 0) return;

    const to = admins.map((a) => a.email);
    if (p.type === "insert") {
      const { node, subject } = banking.template({
        action: "new",
        account_summary: d.bankSummary,
      });
      const res = await send_email(ses, { node, subject, to });
      console.info("sent banking application new email:", res);
    }

    if (p.type === "modify") {
      //both image is present on modify
      await handle_modify(p, to);
    }
  } catch (err) {
    //don't retry on error
    console.error(err);
  }
};

async function handle_modify(mod: IModify<IApplication>, to: string[]) {
  //APPROVED - doesn't handle auto default
  const prev = to_bapp(mod.prev);
  const curr = to_bapp(mod.curr);

  if (!prev || !curr) return;
  if (prev.status === "under-review" && curr.status === "approved") {
    const { node, subject } = banking.template({
      action: "approved",
      account_summary: curr.bank_summary,
    });
    const res = await send_email(ses, { node, subject, to });
    console.info("sent banking application approval email:", res);
    return;
  }

  //REJECTED
  if (prev.status === "under-review" && curr.status === "rejected") {
    const { node, subject } = banking.template({
      action: "rejected",
      account_summary: curr.bank_summary,
      rejection_reason: curr.rejection_reason,
    });
    const res = await send_email(ses, { node, subject, to });
    console.info("sent banking application rejection email:", res);
  }

  // set prev approved to DEFAULT
  // an increase in priority num - always higher than prev default priority num
  if (prev.status === "approved" && prev.this_pn < curr.this_pn) {
    const { node, subject } = banking.template({
      action: "default",
      account_summary: curr.bank_summary,
    });
    const res = await send_email(ses, { node, subject, to });
    console.info("sent banking application default email:", res);
  }
}
