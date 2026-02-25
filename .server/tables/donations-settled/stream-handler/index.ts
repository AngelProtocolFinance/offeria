import { emails } from "@/constants/common";
import type { IDonationFinal } from "@/donation";
import { is_recurring } from "@/donation/helpers";
import { send_email, to_amount } from "@/helpers/email";
import { to_payload } from "@/helpers/stream";
import { donation_nonprofit_notif } from "@better-giving/react-emails";
import type { DynamoDBStreamHandler } from "aws-lambda";
import { ses } from "../../../kit/ses";
import { userdb } from "../../../tables/users";
import { update_country_metrics } from "./country-metrics";
import { ensure } from "./helpers";
import { trigger_webhooks } from "./trigger-webhooks";

export const handler: DynamoDBStreamHandler = async (event) => {
  // batch size 1
  const p = to_payload<IDonationFinal>(event.Records[0]);
  if (!p || p.type !== "insert") return;

  const r = ensure(p.data, [
    "network",
    "endowmentId",
    "charityName",
    "transactionDate",
    "amount",
    "usdValue",
    "donationFinalTxDate",
    "donationFinalAmount",
    "email",
    "appUsed",
    "denomination",
  ]);

  await update_country_metrics({
    npo: r.endowmentId,
    date: r.donationFinalTxDate,
    inc_amount: r.donationFinalAmount,
  }).catch(console.error);

  await trigger_webhooks(r).catch(console.error);

  /// SEND SETTLEMENT NOTICE TO NPO

  const npo_admins = await userdb
    .npo_admins(r.endowmentId)
    .then((x) => x.map((u) => u.email))
    .catch((err) => {
      console.error(err);
      return [] as string[];
    });

  const recipients =
    (r.claimed ?? true) ? npo_admins.concat([emails.hi]) : [emails.hi];

  const data: donation_nonprofit_notif.IData = {
    id: r.transactionId,
    date: r.donationFinalTxDate,
    to_id: r.endowmentId.toString(),
    to_name: r.charityName,
    amount: to_amount(r.amount, r.usdValue, r.denomination),
    program_name: r.programName,
    claimed: r.claimed ?? true,
    is_recurring: is_recurring(r.frequency, r.isRecurring),
    from: {
      full_name: r.fullName || "Anonymous",
      first_name: r.fullName ? r.fullName.split(" ")[0] : "Anonymous",
      address:
        [
          r.streetAddress || r.stateAddress,
          r.city,
          r.state,
          r.zipCode,
          r.country,
        ]
          .filter(Boolean)
          .join(", ") || undefined,
    },
  };
  const { node, subject } = donation_nonprofit_notif.template(data);

  const res = await send_email(ses, { node, subject, to: recipients });
  console.info("sent npo notif", res);
};
