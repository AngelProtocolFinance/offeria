import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { Db, type TxType, UpdateBuilder, dbc } from "../db";
import type {
  IDividendLog,
  ILog,
  INpoSeriesOpts,
  IPage,
  IPageOptions,
  IRebalanceLog,
  ISeries,
  ISeriesPoint,
  TDividendCreditStatus,
} from "./interfaces";

export class NavHistoryDB extends Db {
  gsi1_week_series_pk = `WeekSeries#${this.env}`;
  gsi1_week_series(date: string) {
    return {
      gsi1PK: this.gsi1_week_series_pk,
      gsi1SK: date,
    };
  }
  gsi1_dividend_logs_key(date: string) {
    return { gsi1PK: `DLS#${this.env}`, gsi1SK: date } as const;
  }
  gsi2_day_series_pk = `DaySeries#${this.env}`;
  gsi2_day_series(date: string) {
    return {
      gsi2PK: this.gsi2_day_series_pk,
      gsi2SK: date,
    };
  }

  log_pk = `Log#${this.env}`;
  log_key(date: string) {
    return {
      PK: this.log_pk,
      SK: date,
    };
  }

  dividend_log_key(id: string) {
    return { PK: `DL#${id}`, SK: `DL#${id}` } as const;
  }

  dividend_log_record(data: IDividendLog) {
    return {
      ...this.dividend_log_key(data.id),
      ...this.gsi1_dividend_logs_key(data.date_created),
      ...data,
    };
  }

  async dividend_log_put(data: IDividendLog) {
    const cmd = new PutCommand({
      TableName: this.table,
      Item: this.dividend_log_record(data),
    });
    await dbc.send(cmd);
    return data;
  }

  async dividend_log(id: string): Promise<IDividendLog | undefined> {
    const cmd = new GetCommand({
      TableName: this.table,
      Key: this.dividend_log_key(id),
      ConsistentRead: true,
    });
    return dbc.send(cmd).then(({ Item: i }) => i && this.sans_keys(i));
  }

  dividend_log_mark_npo_completed_txi(
    dividend_id: string,
    npo: string
  ): TxType["Update"] {
    const b = new UpdateBuilder();
    b.set(
      `${"per_npo_credit_status" satisfies keyof IDividendLog}.${npo}`,
      "completed" satisfies TDividendCreditStatus
    );
    return {
      TableName: this.table,
      Key: this.dividend_log_key(dividend_id),
      ...b.collect(),
    };
  }

  rebalance_key(id: string) {
    return {
      PK: `Rebalance#${id}`,
      SK: `Rebalance#${id}`,
    };
  }
  gsi1_rebalances_pk = `Rebalances#${this.env}`;
  gsi1_rebalances(date: string) {
    return {
      gsi1PK: this.gsi1_rebalances_pk,
      gsi1SK: date,
    };
  }

  async list(opts?: IPageOptions): Promise<IPage<ILog>> {
    const cmd = new QueryCommand({
      TableName: this.table,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": this.log_pk,
      },
      Limit: opts?.limit ?? 10,
      ExclusiveStartKey: this.key_to_obj(opts?.next),
      ScanIndexForward: false,
      ConsistentRead: opts?.consistent,
    });
    return dbc.send(cmd).then(this.to_page<ILog>);
  }

  async ltd(): Promise<ILog> {
    const page1 = await this.list({ limit: 1, consistent: true });
    return page1.items[0];
  }

  async week_series(opts?: IPageOptions): Promise<IPage<ILog>> {
    const cmd = new QueryCommand({
      TableName: this.table,
      IndexName: "gsi1",
      KeyConditionExpression: "gsi1PK = :gsi1PK",
      ExpressionAttributeValues: {
        ":gsi1PK": this.gsi1_week_series_pk,
      },
      Limit: opts?.limit ?? 10,
      ExclusiveStartKey: this.key_to_obj(opts?.next),
      ScanIndexForward: false,
    });
    return dbc.send(cmd).then(this.to_page<ILog>);
  }

  async day_series(opts?: IPageOptions): Promise<IPage<ILog>> {
    const cmd = new QueryCommand({
      TableName: this.table,
      IndexName: "gsi2",
      KeyConditionExpression: "gsi2PK = :gsi2PK",
      ExpressionAttributeValues: {
        ":gsi2PK": this.gsi2_day_series_pk,
      },
      Limit: opts?.limit ?? 10,
      ExclusiveStartKey: this.key_to_obj(opts?.next),
      ScanIndexForward: false,
    });
    return dbc.send(cmd).then(this.to_page<ILog>);
  }

  log_record(data: ILog, series?: ISeries) {
    return {
      ...data,
      ...this.log_key(data.date),
      // adds to gsi1
      ...(series?.week ? this.gsi1_week_series(data.date) : {}),
      // adds to gsi2
      ...(series?.day ? this.gsi2_day_series(data.date) : {}),
    };
  }

  log_put_txi(
    ...[data, series]: Parameters<typeof this.log_record>
  ): TxType["Put"] {
    return {
      TableName: this.table,
      Item: this.log_record(data, series),
    };
  }
  async log_put(...[data, series]: Parameters<typeof this.log_record>) {
    const cmd = new PutCommand({
      TableName: this.table,
      Item: this.log_record(data, series),
    });
    return dbc.send(cmd);
  }

  rebalance_record(data: IRebalanceLog) {
    return {
      ...data,
      ...this.rebalance_key(data.id),
      // adds to gsi1
      ...this.gsi1_rebalances(data.date),
    };
  }
  rebalance_put_txi(data: IRebalanceLog): TxType["Put"] {
    return {
      TableName: this.table,
      Item: this.rebalance_record(data),
    };
  }

  rebalances(opts?: IPageOptions): Promise<IPage<IRebalanceLog>> {
    const cmd = new QueryCommand({
      TableName: this.table,
      IndexName: "gsi1",
      KeyConditionExpression: "gsi1PK = :gsi1PK",
      ExpressionAttributeValues: {
        ":gsi1PK": this.gsi1_rebalances_pk,
      },
      Limit: opts?.limit ?? 10,
      ExclusiveStartKey: this.key_to_obj(opts?.next),
      ScanIndexForward: false,
    });
    return dbc.send(cmd).then(this.to_page<IRebalanceLog>);
  }

  async npo_series(id: number, opts?: INpoSeriesOpts): Promise<ISeriesPoint[]> {
    const { range: r = "quarter" } = opts ?? {};
    const limit = (($) => {
      switch ($) {
        case "week":
          return 7; //days
        case "month":
          return 30; //days
        case "quarter":
          return 13; //weeks
        case "year":
          return 52; //weeks
        default:
          return 30;
      }
    })(r);
    const series_fn =
      r === "week" || r === "month"
        ? this.day_series({ limit })
        : this.week_series({ limit });

    const { items = [] } = await series_fn;
    const points = items.toReversed().map((i) => {
      const units = i.holders[id] || 0;
      const price = i.price;
      return {
        date: i.date,
        price: price,
        units,
        value: units * price,
      };
    });

    return points;
  }
}
