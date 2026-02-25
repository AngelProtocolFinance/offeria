import { GRANTS_CRON, GRANTS_EXEC_DELAY_DAYS } from "$/crons/grants/schedule";
import { baldb } from "$/tables/balances";
import { bappdb } from "$/tables/banking-applications";
import { navdb } from "$/tables/nav-history";
import { podb } from "$/tables/payouts-v2";
import type { IBapp } from "@/banking-applications";
import type { INpoPayoutsPage, INpoSettlementsPage } from "@/payouts";
import { CronExpressionParser } from "cron-parser";
import { admin_ctx } from "#/.server/auth";
import { endowUpdate } from "../endow-update-action";
import type { Route } from "./+types/dashboard";

export interface DashboardData {
  id: number;
  bal_liq: number;
  bal_lock: number;
  bal_cash: number;
  /** compute in server save client bundle */
  recent_payouts: INpoPayoutsPage;
  recent_settlements: INpoSettlementsPage;
  next_payout: string;
  pm?: IBapp;
}

export const endowUpdateAction = endowUpdate({ redirect: "." });
export const loader = async (x: Route.LoaderArgs) => {
  const id = x.context.get(admin_ctx);

  const interval = CronExpressionParser.parse(GRANTS_CRON);
  const prev = interval.prev().toDate();
  const ms_delay = GRANTS_EXEC_DELAY_DAYS * 24 * 60 * 60 * 1000;
  const exec_from_prev = new Date(prev.getTime() + ms_delay);

  // if prev trigger's execution hasn't happened yet, that's the next payout
  const next =
    exec_from_prev > new Date()
      ? exec_from_prev
      : new Date(interval.next().toDate().getTime() + ms_delay);

  const [ltd, bal, recent_payouts, recent_settlements, pm] = await Promise.all([
    navdb.ltd(),
    baldb.npo_balance(id),
    podb.npo_payouts(id.toString(), { limit: 3 }),
    podb.npo_settlements(id.toString(), { limit: 3 }),
    bappdb.npo_default_bapp(id),
  ]);

  return {
    id,
    bal_liq: bal.liq,
    bal_lock: bal.lock_units * ltd.price,
    bal_cash: bal.cash,
    recent_payouts,
    recent_settlements,
    next_payout: next.toISOString(),
    pm,
  } satisfies DashboardData;
};
