import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { Db, type TxType, dbc } from "../db";
import type { Metrics } from "./interfaces";

export class MetricsDb extends Db {
  key_country(country_key: string): Metrics.Country.Keys {
    return { PK: `Country#${country_key}`, SK: this.env };
  }

  key_country_metrics_time(): Metrics.CountryMetricsTime.Keys {
    return { PK: "CountryMetricsTime", SK: this.env };
  }

  async country_metrics_time(): Promise<
    Metrics.CountryMetricsTime.DBRecord | undefined
  > {
    const cmd = new GetCommand({
      TableName: this.table,
      Key: this.key_country_metrics_time(),
    });
    return dbc
      .send(cmd)
      .then((r) => r.Item as Metrics.CountryMetricsTime.DBRecord | undefined);
  }

  country_update_txi(r: {
    country_key: string;
    country_name: string;
    inc_amount: number;
    date: string;
    is_new_week: boolean;
  }): TxType["Update"] {
    type K = keyof Metrics.Country.DBRecord;
    return {
      TableName: this.table,
      Key: this.key_country(r.country_key),
      UpdateExpression: `SET #sum7d = ${
        r.is_new_week ? ":amount" : "if_not_exists(#sum7d, :zero) + :amount"
      }, #sum = if_not_exists(#sum, :zero) + :amount, #name = :name, gsi1PK = :gsi1PK, gsi1SK = :gsi1SK`,
      ExpressionAttributeNames: {
        "#sum7d": "totalDonations7d" satisfies K,
        "#sum": "totalDonations" satisfies K,
        "#name": "name" satisfies K,
      },
      ExpressionAttributeValues: {
        ":amount": r.inc_amount,
        ":zero": 0,
        ":name": r.country_name,
        ":gsi1PK": `Countries#${this.env}`,
        ":gsi1SK": r.date,
      },
    };
  }

  country_time_update_txi(week_num: number): TxType["Update"] {
    return {
      TableName: this.table,
      Key: this.key_country_metrics_time(),
      UpdateExpression: "SET weekNum = :num",
      ExpressionAttributeValues: { ":num": week_num },
    };
  }

  async countries(): Promise<Metrics.Country.Gsi1.DBRecord[]> {
    const cmd = new QueryCommand({
      TableName: this.table,
      IndexName: "gsi1",
      KeyConditionExpression: "gsi1PK = :pk",
      ExpressionAttributeValues: { ":pk": `Countries#${this.env}` },
      ScanIndexForward: false,
    });
    const res = await dbc.send(cmd);
    return (res.Items ?? []) as Metrics.Country.Gsi1.DBRecord[];
  }
}
