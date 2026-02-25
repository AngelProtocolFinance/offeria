import { btxdb } from "$/tables/bal-txs";
import { balance_txs_options } from "@/balance-txs";
import { search } from "@/helpers/https";
import type { LoaderFunctionArgs } from "react-router";
import * as v from "valibot";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const opts = v.parse(balance_txs_options, search(request));

  return btxdb.txs({ ...opts, acc: "lock", limit: 10 });
};
