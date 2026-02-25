import { navdb } from "$/tables/nav-history";
import { dbc } from "@/db";
import { rd } from "@/helpers/decimal";
import { dividend_log_fv } from "@/nav/schemas";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { produce } from "immer";
import { nanoid } from "nanoid";
import { redirect } from "react-router";
import { parse } from "valibot";
import { npo_dividend_comps } from "#/.server/npos-dividend-comps";
import { credit_txs } from "../credit-txs";
import type { Route } from "./+types";

export const action = async ({ request }: Route.ActionArgs) => {
  /** exclude: use server side time */
  const { date, ...fv } = parse(dividend_log_fv, await request.json());

  const nav = await navdb.ltd();
  const { per_npo_units, purchased_units, per_npo_units_status } =
    await npo_dividend_comps(+fv.total, nav);

  const div_date = new Date().toISOString();

  const npos = Object.keys(per_npo_units);

  // log intr, with pending alloc status
  const { id: div_id } = await navdb.dividend_log_put({
    amount_units: purchased_units,
    amount_usd: +fv.total,
    date_created: div_date,
    per_npo_units,
    per_npo_credit_status: per_npo_units_status,
    id: nanoid(),
  });

  type TCredit = { units: number; usd: number };
  const per_npo_credited_usd: [string, TCredit][] = [];
  for (const npo of npos) {
    const bu = nav.holders[npo];
    const u = per_npo_units[npo];
    const to_credit_usd = u * nav.price;
    const txs = credit_txs({
      ticker: fv.ticker,
      npo,
      npo_units_bal: bu,
      div_id,
      div_date,
      to_credit_units: u,
      to_credit_usd,
    });

    const cmd = new TransactWriteCommand({
      TransactItems: txs.all,
    });
    await dbc.send(cmd).catch((err) => {
      console.error(err);
      console.error("failed to credit", npo, per_npo_units[npo]);
    });

    per_npo_credited_usd.push([npo, { units: u, usd: to_credit_usd }]);
    console.info("credited", npo, per_npo_units[npo]);
  }

  if (per_npo_credited_usd.length > 0) {
    const new_nav = produce(nav, (x) => {
      let total_credited_usd = 0;
      for (const [npo, credited] of per_npo_credited_usd) {
        x.holders[npo] += credited.units;
        x.units += credited.units;

        // dividends are reinvested to cash portion
        x.composition.CASH.qty += credited.usd;
        x.composition.CASH.value += credited.usd;
        x.value += credited.usd;

        total_credited_usd += credited.usd;
      }
      x.reason = `dividend:${div_id} $${rd(total_credited_usd)} reinvested`;
      x.date = div_date;
    });

    await navdb.log_put(new_nav).catch((err) => {
      console.error(err);
      console.error("failed to log nav after dividend credits");
    });
  }

  return redirect("..");
};
