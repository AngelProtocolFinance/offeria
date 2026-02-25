import { btxdb } from "$/tables/bal-txs";
import { baldb } from "$/tables/balances";
import { navdb } from "$/tables/nav-history";
import { podb } from "$/tables/payouts-v2";
import type { IBalanceTx } from "@/balance-txs";
import { Txs, dbc } from "@/db";
import { type IPayout, PayoutsDB } from "@/payouts";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { produce } from "immer";
import { nanoid } from "nanoid";
import { type ActionFunction, redirect } from "react-router";
import * as v from "valibot";
const verdict_schema = v.picklist(["approve", "reject"]);
const tx_id_schema = v.pipe(
  v.string("required"),
  v.nonEmpty("tx id is required")
);

export const action: ActionFunction = async ({ params, request }) => {
  const fv = await request.formData();
  const verdict = v.parse(verdict_schema, fv.get("verdict"));
  const tx_id = v.parse(tx_id_schema, params.tx_id);

  const timestamp = new Date().toISOString();

  const tx = await btxdb.tx(tx_id);
  if (!tx) return { status: 404 };

  if (tx.account !== "lock") throw `expected lock account, got ${tx.account}`;

  const ltd = await navdb.ltd();

  if (ltd.composition.CASH.value < tx.amount) {
    throw "insufficient cash balance to approve this request.";
  }

  if (verdict === "reject") {
    const txs = new Txs();
    const upd81 = await btxdb.tx_update_status_txi(tx, "cancelled");
    //add back units
    const upd82 = baldb.balance_update_txi(+tx.owner, {
      lock_units: ["inc", tx.amount_units],
    });
    txs.update(upd81).update(upd82);
    const cmd = new TransactWriteCommand({ TransactItems: txs.all });
    await dbc.send(cmd);
    return redirect("..");
  }

  const txs = new Txs();
  const upd81 = await btxdb.tx_update_status_txi(tx, "final");
  txs.update(upd81);

  // units adjustment based on ltd
  const units_curr = tx.amount / ltd.price;
  const units_bal = ltd.holders[tx.owner] || 0;
  /** if units price go up, fewer units would be sold, and more otherwise */
  const units_to_deduct = Math.min(units_curr, units_bal);
  const usd_to_deduct = units_to_deduct * ltd.price;
  const units_diff = tx.amount_units - units_to_deduct;

  //log nav
  const new_nav = produce(ltd, (x) => {
    x.reason = `npo:${tx.owner} units redemption with units diff:${units_diff}`;
    x.date = timestamp;
    x.units -= units_to_deduct;

    //redemptions are from cash portion
    x.composition.CASH.qty -= usd_to_deduct;
    x.composition.CASH.value -= usd_to_deduct;

    x.value -= usd_to_deduct;
    x.holders[tx.owner] -= units_to_deduct;
  });
  txs.put(navdb.log_put_txi(new_nav));

  //transfer to savings
  if (tx.account_other === "liq") {
    const bal = await baldb.npo_balance(+tx.owner);
    const liq_tx: IBalanceTx = {
      id: nanoid(),
      date_created: timestamp,
      date_updated: timestamp,
      owner: tx.owner,
      status: "final",
      account: "liq",
      bal_begin: bal.liq,
      bal_end: bal.liq + tx.amount,
      amount: tx.amount,
      amount_units: tx.amount,
      account_other_id: tx.id,
      account_other: "lock",
      account_other_bal_begin: tx.bal_begin,
      account_other_bal_end: tx.bal_begin - tx.amount_units,
    };
    // combine lock_units adjustment with liq update to avoid multiple operations on same item
    const bal_update = baldb.balance_update_txi(+tx.owner, {
      liq: ["inc", tx.amount],
      lock_units: ["inc", units_diff], // reflect unused/extra units if price goes higher
    });

    txs.put(btxdb.tx_put_txi(liq_tx));
    txs.update(bal_update);
    const cmd = new TransactWriteCommand({ TransactItems: txs.all });
    await dbc.send(cmd);

    return redirect("..");
  }

  //transfer to grant
  const payout: IPayout = {
    id: nanoid(),
    source_id: tx.id,
    recipient_id: tx.owner,
    source: "lock",
    date: timestamp,
    amount: tx.amount,
    type: "pending",
  };
  txs.put({
    TableName: PayoutsDB.name,
    Item: podb.payout_record(payout),
  });
  // combine lock_units adjustment with payout updates to avoid multiple operations on same item
  const bal_update = baldb.balance_update_txi(+tx.owner, {
    payoutsPending: ["inc", tx.amount],
    cash: ["inc", tx.amount],
    lock_units: ["inc", units_diff], // reflect unused/extra units if price goes higher
  });
  txs.update(bal_update);
  const cmd = new TransactWriteCommand({ TransactItems: txs.all });
  await dbc.send(cmd);

  return redirect("..");
};
