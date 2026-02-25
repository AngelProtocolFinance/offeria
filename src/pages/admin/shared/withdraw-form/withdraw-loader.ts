import { baldb } from "$/tables/balances";
import { navdb } from "$/tables/nav-history";
import type { LoaderFunctionArgs } from "react-router";
import { admin_ctx } from "#/.server/auth";

export interface LoaderData {
  id: number;
  bal_lock: number;
  bal_liq: number;
}

export const withdraw_loader = async (x: LoaderFunctionArgs) => {
  const id = x.context.get(admin_ctx);

  const [ltd, bal] = await Promise.all([navdb.ltd(), baldb.npo_balance(id)]);

  return {
    id,
    bal_lock: bal.lock_units * ltd.price,
    bal_liq: bal.liq,
  } satisfies LoaderData;
};
