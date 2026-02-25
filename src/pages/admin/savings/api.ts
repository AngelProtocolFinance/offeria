import { btxdb } from "$/tables/bal-txs";
import { baldb } from "$/tables/balances";
import type { IBalanceTxsPage } from "@/balance-txs";
import type { LoaderFunctionArgs } from "react-router";
import * as v from "valibot";
import { admin_ctx } from "#/.server/auth";

export interface LoaderData extends IBalanceTxsPage {
  bal_liq: number;
}

export const loader = async (x: LoaderFunctionArgs) => {
  const { searchParams: s } = new URL(x.request.url);
  const key = v.parse(
    v.nullable(v.pipe(v.string(), v.base64())),
    s.get("next")
  );

  const id = x.context.get(admin_ctx);

  const [{ liq }, btx_page] = await Promise.all([
    baldb.npo_balance(id),
    btxdb.owner_txs(id.toString(), "liq", {
      next: key ?? undefined,
      limit: 10,
    }),
  ]);

  return {
    bal_liq: liq,
    ...btx_page,
  } satisfies LoaderData;
};
