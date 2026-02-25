import crypto from "node:crypto";
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  type QueryCommandInput,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Db, type TxType, UpdateBuilder, dbc } from "../db";
import { max_date, min_date } from "./constants";
import type { IRegUpdateDb, IRegsPage } from "./interfaces";
import type { IReg, IRegNew, IRegsSearchObj, TStatus } from "./schema";

export class RegDb extends Db {
  static readonly gsi1 = "gsi1";
  static readonly gsi2 = "gsi2";
  key_reg(id: string) {
    return { PK: `Reg#${id}`, SK: `Reg#${id}` } as const;
  }

  /** @param date date created/updated */
  gsi1_user_reg(email: string, status: TStatus, date: string) {
    return {
      gsi1PK: `UserReg#${email.toLowerCase()}`,
      gsi1SK: `${status}#${date}`,
    } as const;
  }

  /** @param date date created/updated */
  gsi2_regs(status: TStatus, date: string) {
    return { gsi2PK: `Regs#${this.env}`, gsi2SK: `${status}#${date}` } as const;
  }

  async reg(id: string): Promise<IReg | undefined> {
    const cmd = new GetCommand({
      TableName: this.table,
      Key: this.key_reg(id),
    });
    const { Item: i } = await dbc.send(cmd);
    return i && this.sans_keys(i);
  }

  async regs(opts?: IRegsSearchObj): Promise<IRegsPage> {
    const {
      start_date = min_date,
      end_date = max_date,
      status = "02",
    } = opts || {};
    const sk_start = this.gsi2_regs(status, start_date).gsi2SK;
    const sk_end = this.gsi2_regs(status, end_date).gsi2SK;

    const query: QueryCommandInput = {
      TableName: this.table,
      IndexName: RegDb.gsi2,
      KeyConditionExpression: "gsi2PK = :pk AND gsi2SK BETWEEN :start AND :end",
      ExpressionAttributeValues: {
        ":pk": this.gsi2_regs(status, "not-used").gsi2PK,
        ":start": sk_start,
        ":end": sk_end,
      },
      ExclusiveStartKey: this.key_to_obj(opts?.next),
      Limit: 15,
    };

    if (opts?.country) {
      query.FilterExpression = "#country = :country";
      query.ExpressionAttributeNames = {
        ...query.ExpressionAttributeNames,
        "#country": "o_hq_country" satisfies keyof IReg,
      };
      query.ExpressionAttributeValues = {
        ...query.ExpressionAttributeValues,
        ":country": opts.country,
      };
    }
    const cmd = new QueryCommand(query);

    return dbc.send(cmd).then((r) => this.to_page(r));
  }

  reg_update_build(update: IRegUpdateDb): UpdateBuilder {
    type K = keyof IReg;

    const { status, ...upd8 } = update;
    const upb = new UpdateBuilder();
    const updated = new Date().toISOString();
    upb.set("updated_at" satisfies K, updated);

    //update gsi keys
    const gsi1SK = this.gsi1_user_reg("not-used", status, updated).gsi1SK;
    upb.set("gsi1SK", gsi1SK);
    const gsi2SK = this.gsi2_regs(status, updated).gsi2SK;
    upb.set("gsi2SK", gsi2SK);

    for (const [k, v] of Object.entries(upd8)) {
      if (v != null) upb.set(k, v);
    }
    upb.set("status" satisfies K, status);
    return upb;
  }

  async reg_update(
    id: string,
    update: IRegUpdateDb | UpdateBuilder
  ): Promise<IReg> {
    const build =
      update instanceof UpdateBuilder ? update : this.reg_update_build(update);

    const cmd = new UpdateCommand({
      TableName: this.table,
      Key: this.key_reg(id),
      ...build.collect(),
      ReturnValues: "ALL_NEW",
    });
    return dbc.send(cmd).then((x) => this.sans_keys(x.Attributes ?? {}));
  }

  reg_update_txi(
    id: string,
    update: IRegUpdateDb | UpdateBuilder
  ): TxType["Update"] {
    const build =
      update instanceof UpdateBuilder ? update : this.reg_update_build(update);
    return {
      TableName: this.table,
      Key: this.key_reg(id),
      ...build.collect(),
    };
  }

  reg_record(data: IRegNew): IReg {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    return {
      ...this.key_reg(id),
      ...this.gsi1_user_reg(data.r_id, "01", now),
      ...this.gsi2_regs("01", now),
      ...data,
      id,
      env: this.env,
      status: "01",
      created_at: now,
      updated_at: now,
    };
  }
  async reg_put(data: IRegNew): Promise<string> {
    const item = this.reg_record(data);
    const cmd = new PutCommand({
      TableName: this.table,
      Item: item,
    });
    await dbc.send(cmd);
    return item.id;
  }
}

export interface IRegb
  extends IReg,
    ReturnType<RegDb["gsi2_regs"]>,
    ReturnType<RegDb["gsi1_user_reg"]>,
    ReturnType<RegDb["key_reg"]> {}
