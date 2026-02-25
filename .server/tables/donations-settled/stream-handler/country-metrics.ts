import { Txs, dbc } from "@/db";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { getWeek } from "date-fns";
import { npodb } from "../../../tables/endowments";
import { metricsdb } from "../../../tables/metrics";

function YYWW(iso: string): number {
  const date = new Date(iso);
  const year = String(date.getFullYear()).substring(2);
  const weekNum = String(getWeek(date)).padStart(2, "0");
  return +`${year}${weekNum}`;
}

export async function update_country_metrics(r: {
  npo: number;
  date: string;
  inc_amount: number;
}) {
  const npo = await npodb.npo(r.npo, ["hq_country"]);
  if (!npo || !npo.hq_country) return;

  const metric_time = await metricsdb.country_metrics_time();
  if (!metric_time) return;

  const week_num = YYWW(r.date);
  const is_new_week = week_num > metric_time.weekNum;

  const country_key = npo.hq_country.trim().toLowerCase().replace(/ /g, "_");

  const txs = new Txs();
  txs.update(
    metricsdb.country_update_txi({
      country_key,
      country_name: npo.hq_country,
      inc_amount: r.inc_amount,
      date: r.date,
      is_new_week,
    })
  );

  if (is_new_week) {
    txs.update(metricsdb.country_time_update_txi(week_num));
  }

  const cmd = new TransactWriteCommand({
    TransactItems: txs.all,
  });
  await dbc.send(cmd);
  console.info(`${r.npo}:${country_key} +${r.inc_amount}`);
}
