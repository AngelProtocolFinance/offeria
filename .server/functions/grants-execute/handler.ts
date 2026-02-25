import crypto from "node:crypto";
import { Txs, dbc } from "@/db";
import type {
  IPayout,
  IPendingStatus,
  ISettledStatus,
  ISettlement,
  PayoutsDB,
} from "@/payouts";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import type { Handler } from "aws-lambda";
import { nvs } from "../../env";
import { aws_monitor } from "../../kit/discord";
import { baldb } from "../../tables/balances";
import { bappdb } from "../../tables/banking-applications";
import { npodb } from "../../tables/endowments";
import { podb } from "../../tables/payouts-v2";
import { transfer_grant } from "./transfer-grant";

const fn = `grants-processor:${nvs.app.env}`;

export const index: Handler = async () => {
  try {
    const grants = await podb.pending_payouts();

    if (grants.length === 0) {
      await aws_monitor.send_alert({
        type: "NOTICE",
        from: fn,
        title: "No grants to process",
        body: `No grants to process for ${nvs.app.env}`,
      });
      return { statusCode: 200, body: "No grants to process" };
    }

    const by_npo = Object.groupBy(grants, (g) => g.recipient_id);

    for (const [npo, items = []] of Object.entries(by_npo)) {
      await process_item(+npo, items, podb);
    }
    return { statusCode: 200, body: "Done processing grants" };
  } catch (err) {
    console.error(err);
    await aws_monitor.send_alert({
      type: "ERROR",
      from: fn,
      title: "Unexpected error processing grants",
      body: JSON.stringify(err, Object.getOwnPropertyNames(err)),
    });
    return { statusCode: 500, body: "Something went wrong" };
  }
};

async function process_item(
  npo_id: number,
  items: IPayout<IPendingStatus>[],
  payoutsdb: PayoutsDB
) {
  const payout_date = new Date().toISOString();
  const total = items.reduce((a, b) => a + b.amount, 0);
  const ref_id = crypto.randomUUID();
  try {
    const npo = await npodb.npo(npo_id, ["payout_minimum", "id", "name"]);
    if (!npo) throw `npo:${npo_id} not found`;
    if ((npo.payout_minimum ?? 50) > total) {
      console.info(
        `npo:${npo_id} payout minimum not met, min: ${npo.payout_minimum}, total: ${total}`
      );
      return;
    }

    const wise_id = await bappdb.npo_default_bapp(npo.id).then((x) => x?.id);
    if (!wise_id) {
      console.info(`No wise recipient found for npo:${npo}`);
      return;
    }

    const transfer_id = await transfer_grant(+wise_id, total, ref_id);
    const txs = new Txs();
    for (const item of items) {
      const upd8 = payoutsdb.payout_update_txi<ISettledStatus>(item.id, {
        type: "settled",
        settled_date: payout_date,
        settled_id: transfer_id.toString(),
      });
      txs.update(upd8);
    }

    const settlement: ISettlement = {
      id: transfer_id.toString(),
      other_id: ref_id,
      recipient_id: npo_id.toString(),
      date: payout_date,
      amount: total,
      sources: items.map((i) => i.source_id),
      status: "",
    };

    txs.put(payoutsdb.settlement_put_txi(settlement));

    const bal_update_txi = baldb.balance_update_txi(npo_id, {
      cash: ["dec", total],
    });
    txs.update(bal_update_txi);

    const cmd = new TransactWriteCommand({
      TransactItems: txs.all,
    });
    const res = await dbc.send(cmd);
    console.info(ref_id, res);

    await aws_monitor.send_alert({
      type: "NOTICE",
      from: fn,
      title: `Grant paid for npo:${npo.id}: ${npo.name}`,
      fields: [
        { name: "amount", value: total.toString() },
        { name: "transfer_id", value: transfer_id.toString() },
        { name: "ref_id", value: ref_id },
      ],
    });
  } catch (err) {
    console.error(ref_id, err);
    await aws_monitor.send_alert({
      type: "ERROR",
      from: fn,
      title: `Failed to process grant for npo:${npo_id}`,
      body: JSON.stringify(err, Object.getOwnPropertyNames(err)),
    });
  }
}
