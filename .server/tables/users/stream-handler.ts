import type { TRecord } from "@/db";
import { send_email } from "@/helpers/email";
import { to_payload } from "@/helpers/stream";
import type { IInvite, IUser } from "@/user";
import { admin_endow_admin_new } from "@better-giving/react-emails";
import type { DynamoDBStreamHandler } from "aws-lambda";
import { ses } from "../../kit/ses";

function is_invite(record: TRecord): record is IInvite {
  return record.PK.includes("Invite#");
}

export const index: DynamoDBStreamHandler = async ({ Records }) => {
  const p = to_payload<IUser>(Records[0]);
  if (!p) return console.error("Failed to parse stream record payload");

  if (p.type === "delete") {
    return console.info("delete event, skipping");
  }

  const d = p.type === "modify" ? p.curr : p.data;
  if (!is_invite(d)) {
    return console.info("not an invite record, skipping");
  }

  const { node, subject } = admin_endow_admin_new.template({
    first_name: d.inviteeFirstName,
    invitor: d.invitor,
    endow_name: d.endowName,
  });
  const res = await send_email(ses, {
    node,
    subject,
    to: [d.invitee],
  });

  console.info("invite email sent:", res);
};
