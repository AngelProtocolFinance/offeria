import {
  BatchGetCommand,
  DeleteCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { UUID_REGEX } from "valibot";
import { Db, type TRecord, type TxType, UpdateBuilder, dbc } from "../db";
import type { IFund, IFundsPageOpts } from "./interfaces";
import type { IFundUpdate } from "./schema";

export class FundDb extends Db {
  static readonly slug_env_gsi = "slug-env-gsi";
  key_fund(id: string) {
    return { PK: `Fund#${id}`, SK: `Fund#${id}` } as const;
  }

  gsi1_funds_key(date_created: string) {
    return { gsi1PK: `Funds#${this.env}`, gsi1SK: date_created } as const;
  }

  fund_record(data: IFund) {
    return {
      ...this.key_fund(data.id),
      ...(data.created_at && this.gsi1_funds_key(data.created_at)),
      ...data,
    } as const;
  }

  fund_put_txi(data: IFund): TxType["Put"] {
    return {
      TableName: this.table,
      Item: this.fund_record(data),
    };
  }
  /**@param id - slug or uuid */
  async fund(id: string): Promise<IFund | undefined> {
    let item: TRecord | undefined;
    if (UUID_REGEX.test(id)) {
      const cmd = new GetCommand({
        TableName: this.table,
        Key: this.key_fund(id),
      });
      const res = await dbc.send(cmd);
      item = res.Item;
    } else {
      const cmd = new QueryCommand({
        TableName: this.table,
        Limit: 1,
        IndexName: FundDb.slug_env_gsi,
        KeyConditionExpression: "slug = :slug AND env = :env",
        ExpressionAttributeValues: {
          ":slug": id,
          ":env": this.env,
        },
      });
      const { Items: i = [] } = await dbc.send(cmd);
      item = i[0];
    }
    return item && this.sans_keys(item);
  }

  async funds_get(ids: string[]): Promise<IFund[]> {
    if (ids.length === 0) return [];
    const cmd = new BatchGetCommand({
      RequestItems: {
        [this.table]: { Keys: ids.map((id) => this.key_fund(id)) },
      },
    });
    const { Responses } = await dbc.send(cmd);
    const x = Responses?.[this.table] ?? [];
    return x.map((i) => this.sans_keys(i));
  }

  async funds(opts: IFundsPageOpts) {
    const cmd = new QueryCommand({
      TableName: this.table,
      Limit: opts.limit ?? 10,
      ExclusiveStartKey: this.key_to_obj(opts.next),
      IndexName: "gsi1",
      KeyConditionExpression: "gsi1PK = :pk",
      ScanIndexForward: false,
      ExpressionAttributeValues: { ":pk": `Funds#${this.env}` },
    });
    return dbc.send(cmd).then(this.to_page<IFund>);
  }

  async fund_delete(id: string) {
    const command = new DeleteCommand({
      TableName: this.table,
      Key: this.key_fund(id),
    });
    return dbc.send(command);
  }

  async fund_update(id: string, { target, slug, ...update }: IFundUpdate) {
    const updates = new UpdateBuilder();

    if (slug) updates.set("slug", slug);
    if (slug === "") updates.remove("slug");

    if (target || target === "0") {
      updates.set("target", target);
    }

    for (const [k, v] of Object.entries(update)) {
      if (v === undefined) continue;
      updates.set(k, v);
    }

    const command = new UpdateCommand({
      TableName: this.table,
      Key: this.key_fund(id),
      ReturnValues: "ALL_NEW",
      ...updates.collect(),
    });

    return dbc.send(command).then((res) => res.Attributes ?? {});
  }

  fund_contrib_update_txi(id: string, amount: number): TxType["Update"] {
    return {
      TableName: this.table,
      Key: this.key_fund(id),
      UpdateExpression: "SET #x = if_not_exists(#x, :zero) + :inc",
      ExpressionAttributeValues: {
        ":inc": amount,
        ":zero": 0,
      },
      ExpressionAttributeNames: {
        "#x": "donation_total_usd" satisfies keyof IFund,
      },
    };
  }

  async fund_close(fund: string) {
    const updates = new UpdateBuilder();
    updates.set("active", false);

    const command = new UpdateCommand({
      TableName: this.table,
      Key: this.key_fund(fund),
      ReturnValues: "ALL_NEW",
      ...updates.collect(),
    });
    return dbc.send(command);
  }
}

export interface IFundDb extends ReturnType<FundDb["fund_record"]> {}
