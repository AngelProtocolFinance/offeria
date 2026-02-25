import { YYYYMMDD } from "@/helpers/date";
import type { ILog } from "@/nav";
import type { Handler } from "aws-lambda";
import { isMonday } from "date-fns";
import { navdb } from "../../tables/nav-history";
import { update_tickers } from "./update-tickers";

export const index: Handler = async () => {
  const now = new Date();
  const now_day_num = YYYYMMDD(now);

  const latest = await navdb.ltd();

  if (!latest) {
    console.info("No nav log found, run init first");
    return { statusCode: 400 };
  }

  if (latest.units === 0) {
    console.info("portfolio has 0 units");
    return { statusCode: 201 };
  }

  const ltd_day_num = YYYYMMDD(latest.price_updated);

  if (now_day_num === ltd_day_num) {
    console.info(`No updates needed for day ${now_day_num}`);
    return { statusCode: 202 };
  }

  const updated_tickers = await update_tickers(
    Object.values(latest.composition)
  );

  const portfolio_value = updated_tickers.reduce((acc, t) => acc + t.value, 0);

  const timestamp = now.toISOString();
  const updated_ltd: ILog = {
    ...latest,
    reason: "daily price update",
    date: timestamp,
    composition: updated_tickers.reduce(
      (acc, t) => ({ ...acc, [t.id]: t }),
      {}
    ),
    price: portfolio_value / latest.units,
    price_updated: timestamp,
    value: portfolio_value,
    holders: Object.fromEntries(
      Object.entries(latest.holders).filter(([_, v]) => v > 0)
    ),
  };

  await navdb.log_put(updated_ltd, { day: true, week: isMonday(now) });
  console.info("Updated LTD:", updated_ltd);
  return { statusCode: 200 };
};
