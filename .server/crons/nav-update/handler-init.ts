import type { IComposition, ILog } from "@/nav";
import { tickers } from "@/nav/schemas";
import type { Handler } from "aws-lambda";
import { navdb } from "../../tables/nav-history";

export const index: Handler = async () => {
  const latest = await navdb.ltd();
  if (latest) {
    console.info("Nav log already exists, skipping init");
    return { statusCode: 200 };
  }

  const now = new Date();
  const init_comps = tickers.reduce((acc, t) => {
    acc[t] = {
      id: t,
      qty: 0,
      price_date: now.toISOString(),
      price: 0,
      value: 0,
    };
    return acc;
  }, {} as IComposition);

  const log: ILog = {
    reason: "init",
    date: now.toISOString(),
    composition: init_comps,
    price: 1,
    price_updated: now.toISOString(),
    value: 0,
    units: 0,
    holders: {},
  };
  const res = await navdb.log_put(log);
  console.info("init nav log:", res);
  return { statusCode: 200 };
};
