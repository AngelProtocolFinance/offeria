import { btxdb } from "$/tables/bal-txs";
import { baldb } from "$/tables/balances";
import { navdb } from "$/tables/nav-history";
import type { IBalanceTx } from "@/balance-txs";
import { Txs } from "@/db";
import { nanoid } from "nanoid";

interface IArgs {
  npo: string;
  npo_units_bal: number;
  div_id: string;
  div_date: string;
  ticker: string;
  to_credit_units: number;
  to_credit_usd: number;
  // nav_ltd: ILog;
}
export const credit_txs = (x: IArgs): Txs => {
  const txs = new Txs();
  const bal_upd8 = baldb.balance_update_txi(+x.npo, {
    lock_units: ["inc", x.to_credit_units],
  });
  txs.update(bal_upd8);

  const tx: IBalanceTx = {
    id: nanoid(),
    date_created: x.div_date,
    date_updated: x.div_date,
    owner: x.npo,
    account: "lock",
    amount: x.to_credit_usd,
    amount_units: x.to_credit_units,
    bal_begin: x.npo_units_bal,
    bal_end: x.npo_units_bal + x.to_credit_units,
    status: "final",

    account_other: "dividend",
    account_other_id: x.div_id,
    account_other_bal_begin: x.to_credit_usd,
    account_other_bal_end: 0,
  };
  txs.put(btxdb.tx_put_txi(tx));
  txs.update(navdb.dividend_log_mark_npo_completed_txi(x.div_id, x.npo));
  return txs;
};
