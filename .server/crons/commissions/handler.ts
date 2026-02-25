import crypto from "node:crypto";
import { dondb } from "$/tables/donations-settled";
import { Txs, dbc } from "@/db";
import type { IDonationFinal } from "@/donation";
import type { ICommission, IPayout } from "@/referrals";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import type { Handler } from "aws-lambda";
import { nvs } from "../../env";
import { aws_monitor } from "../../kit/discord";
import { referralsdb } from "../../tables/commissions";
import { get_referrer } from "./helpers";
import { send_commission } from "./send-commission";

const lambda = `commissions-processor:${nvs.app.env}`;

export const index: Handler = async () => {
  try {
    const items = await referralsdb.commissions_all("pending");

    if (items.length === 0) {
      await aws_monitor.send_alert({
        type: "NOTICE",
        from: lambda,
        title: "No commissions to process",
        body: `No commissions to process for ${nvs.app.env}`,
      });
      return { statusCode: 200, body: "No commissions to process" };
    }

    const grouped = items.reduce(
      (acc, curr) => {
        acc[curr.referrer] ||= [];
        acc[curr.referrer].push(curr);
        return acc;
      },
      {} as { [index: string]: ICommission[] }
    );

    for (const [referrer, sources] of Object.entries(grouped)) {
      await process_item(referrer, sources);
    }

    return { statusCode: 200, body: "Done processing commissions" };
  } catch (err) {
    console.error(err);
    await aws_monitor.send_alert({
      type: "ERROR",
      from: lambda,
      title: "Unexpected error processing commissions",
      body: JSON.stringify(err, Object.getOwnPropertyNames(err)),
    });
    return { statusCode: 500, body: "Something went wrong" };
  }
};

async function process_item(ref_id: string, items: ICommission[]) {
  const total = items.reduce((a, b) => a + b.amount, 0);

  const payout: IPayout = {
    amount: total,
    date: new Date().toISOString(),
    id: crypto.randomUUID(),
    referrer: ref_id,
  };

  try {
    const ref = await get_referrer(ref_id);
    if (!ref) throw `referrer:${ref_id} not found`;

    if (!ref.pay_id) {
      return console.info(`referrer:${ref_id} has no payout method`);
    }
    if (total < ref.pay_min) {
      return console.info(
        `referrer:${ref_id} payout ${total} is less than minimum ${ref.pay_min}`
      );
    }

    const res = await send_commission(ref.pay_id, total, payout.id);
    const txs = new Txs();
    for (const item of items) {
      txs.update(referralsdb.commission_update_status_txi(item, "paid"));
      txs.update({
        TableName: dondb.table,
        Key: { transactionId: item.donation_id } satisfies Pick<
          IDonationFinal,
          "transactionId"
        >,
        UpdateExpression: "SET referrer_commission.#b = :v",
        ExpressionAttributeNames: { "#b": "transfer_id" },
        ExpressionAttributeValues: { ":v": res },
      });
    }

    txs.update(referralsdb.payout_ltd_update_txi(ref.id, total));
    payout.transfer_id = res;
    txs.put(referralsdb.payout_put_txi(payout));

    const cmd = new TransactWriteCommand({ TransactItems: txs.all });
    await dbc.send(cmd);

    await aws_monitor.send_alert({
      type: "NOTICE",
      from: lambda,
      title: `Commission paid for ${ref_id}`,
      fields: [
        { name: "amount", value: payout.amount.toString() },
        { name: "name", value: ref.name },
        { name: "email", value: ref.email },
      ],
    });
  } catch (err) {
    console.error(err);
    payout.error = "Failed to process commission";
    await referralsdb.payout_put(payout);
    await aws_monitor.send_alert({
      type: "ERROR",
      from: lambda,
      title: `Failed to process commission: ${ref_id}`,
      body: JSON.stringify(err, Object.getOwnPropertyNames(err)),
    });
  }
}
