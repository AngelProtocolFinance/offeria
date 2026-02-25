import { TextEncoder } from "node:util";
import { emails } from "@/constants/common";
import { SendEmailCommand } from "@aws-sdk/client-sesv2";
import type { ScheduledHandler } from "aws-lambda";
import { json2csv } from "json-2-csv";
import { nvs } from "../../env";
import { aws_monitor } from "../../kit/discord";
import { ses } from "../../kit/ses";
import { wise } from "../../kit/wise";
import { npodb } from "../../tables/endowments";
import { podb } from "../../tables/payouts-v2";
import { raw_email, to_YYMM } from "./helpers";
import type { CsvRow } from "./types";

/**
 * 1 day before the 3-day cycle
 */
export const index: ScheduledHandler = async (_, ctx) => {
  try {
    const grants = await podb.pending_payouts();
    if (grants.length === 0) {
      console.info("No pending grants to process");
      return;
    }

    const by_npo = Object.groupBy(grants, (g) => g.recipient_id);

    const rows: CsvRow[] = [];
    let total_grant = 0;

    for (const [npo_id, items = []] of Object.entries(by_npo)) {
      const total = items.reduce((acc, cur) => acc + cur.amount, 0);
      const npo = await npodb.npo(+npo_id);
      if (!npo) {
        console.info(`NPO ${npo_id} not found, skipping`);
        continue;
      }
      rows.push({
        "endow-id": npo.id,
        "endow-name": npo.name,
        "grant-amount": total,
      });
      total_grant += total;
    }

    const usd_bal = await wise.balance(
      +nvs.wise.balance_id_usd,
      +nvs.wise.profile_id
    );
    const usd_bal_val = usd_bal.totalWorth.value;

    const from = `Better Giving 😇 <${emails.hi}>`;
    const tos = [emails.tim, emails.chauncey, emails.jms];

    const csv_content = json2csv(rows);

    const report_date = new Date().toISOString();
    const raw = raw_email({
      from,
      tos,
      subject:
        usd_bal_val < total_grant
          ? "WARNING: Low wise balance for grants"
          : "Grants schedule",
      body: `<p>Report period: ${to_YYMM(report_date)}</p>
      <p>Grant total: $${total_grant}</p>
      <p>Wise USD balance: $${usd_bal_val}</p>
      `,
      attachment: {
        fileName: `${report_date}.csv`,
        content: Buffer.from(csv_content).toString("base64"),
      },
    });

    const encoder = new TextEncoder();

    const send_email_cmd = new SendEmailCommand({
      FromEmailAddress: from,
      Destination: { ToAddresses: tos },
      Content: { Raw: { Data: encoder.encode(raw) } },
    });

    const res = await ses.send(send_email_cmd);

    console.info("sent report", res);
  } catch (err) {
    console.error(err);
    await aws_monitor.send_alert({
      from: `${ctx.functionName}`,
      title: "Failed to generate payout report",
      type: "ERROR",
      body: JSON.stringify(err, Object.getOwnPropertyNames(err)),
    });
  }
};
