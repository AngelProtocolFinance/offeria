import { btxdb } from "$/tables/bal-txs";
import { baldb } from "$/tables/balances";
import { navdb } from "$/tables/nav-history";
import type { IBalanceTxsPage } from "@/balance-txs";
import type { LoaderFunctionArgs } from "react-router";

import { search } from "@/helpers/https";
import { admin_ctx } from "#/.server/auth";

export interface LoaderData extends IBalanceTxsPage {
  id: number;
  bal_lock: number;
}

export const loader = async (x: LoaderFunctionArgs) => {
  const id = x.context.get(admin_ctx);

  const { next } = search(x.request);
  const [{ lock_units }, ltd, btxs_page1] = await Promise.all([
    baldb.npo_balance(id),
    navdb.ltd(),
    btxdb.owner_txs(id.toString(), "lock", {
      next,
      limit: 10,
    }),
  ]);
  return {
    id,
    bal_lock: lock_units * ltd.price,
    ...btxs_page1,
  } satisfies LoaderData;
};
