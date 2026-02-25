import type { ICurrencyFvMap } from "@/table";
import type { Handler } from "aws-lambda";
import { nvs_shared } from "../../env";
import { table } from "../../tables/table";

export const index: Handler = async () => {
  const res = await fetch(
    `https://openexchangerates.org/api/latest.json?app_id=${nvs_shared.openexchange.app_id}&base=USD`
  );
  if (!res.ok) throw res;

  const { rates } = await res.json();

  // SLL is now SLE
  const { SLL, ...other_rates } = rates;

  const map: ICurrencyFvMap = {
    date_created: new Date().toISOString(),
    all: other_rates,
  };

  const put = await table.currency_map_put(map, "Usd");
  console.info(put);
  return { statusCode: 200 };
};
