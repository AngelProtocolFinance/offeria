import type { IBalanceTx } from "@/balance-txs";
import { emails } from "@/constants/common";
import { to_pretty_utc } from "@/helpers/date";
import { rd } from "@/helpers/decimal";
import { send_email } from "@/helpers/email";
import { to_payload } from "@/helpers/stream";
import { fnd_mgmt_lock_tx as email } from "@better-giving/react-emails";
import type { DynamoDBStreamHandler } from "aws-lambda";
import { ses } from "../../kit/ses";
import { npodb } from "../../tables/endowments";

export const index: DynamoDBStreamHandler = async (event) => {
  for (const record of event.Records) {
    const payload = to_payload<IBalanceTx>(record);
    if (!payload) continue;

    console.info(payload);

    if (payload.type !== "insert") continue;
    if (payload.data.account !== "lock") continue;
    if (payload.data.account_other === "dividend") continue;

    const npo = await npodb.npo(+payload.data.owner, ["name", "env"]);
    const change = payload.data.bal_end - payload.data.bal_begin;
    if (change === 0) continue;

    const type = change > 0 ? "invest" : "redeem";

    const data: email.IData = {
      amount: rd(payload.data.amount),
      type,
      transactor: npo?.name ?? "Unknown NPO",
      date: to_pretty_utc(payload.data.date_created),
    };
    const { node, subject } = email.template(data);

    const res = await send_email(ses, {
      node,
      subject,
      to: Object.values(emails),
    });
    console.info("sent lock tx email:", res);
  }
};
