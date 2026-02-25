import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Db, type TxType, UpdateBuilder, dbc } from "../db";
import { status_flags } from "./helpers";
import type {
  IDonation,
  IDonationUpdate,
  IDonsFromOpts,
  IDonsFromPage,
  TStatus,
} from "./interfaces";

type K = keyof IDonation;

export class Don2Db extends Db {
  static readonly gsi1 = "gsi1";
  static readonly gsi2 = "gsi2";

  key(id: string) {
    return { PK: `Don#${id}`, SK: `Don#${id}` } as const;
  }

  gsi1_legacy_key(id_v1: string) {
    return { gsi1PK: `ByV1#${id_v1}`, gsi1SK: `ByV1#${id_v1}` } as const;
  }

  gsi2_dons_from_pk(from_email: string) {
    return `DonsFrom#${from_email}` as const;
  }
  gsi2_dons_from_sk(ulid: string, status: TStatus) {
    return `${status_flags[status]}#${ulid}` as const;
  }
  gsi2_dons_from_key(from_email: string, ulid: string, status: TStatus) {
    return {
      gsi2PK: this.gsi2_dons_from_pk(from_email),
      gsi2SK: this.gsi2_dons_from_sk(ulid, status),
    } as const;
  }

  record(data: IDonation) {
    return {
      ...this.key(data.id),
      ...data,
      ...(data.id_v1 && this.gsi1_legacy_key(data.id_v1)),
      ...this.gsi2_dons_from_key(data.from_email, data.id, data.status),
    };
  }

  async put(data: IDonation): Promise<IDonation> {
    const r = this.record(data);
    const cmd = new PutCommand({
      TableName: this.table,
      Item: this.record(data),
      ConditionExpression: "attribute_not_exists(PK)",
    });
    await dbc.send(cmd);
    return r;
  }
  put_txi(data: IDonation): TxType["Put"] {
    return {
      TableName: this.table,
      ConditionExpression: "attribute_not_exists(PK)",
      Item: this.record(data),
    };
  }

  async get(id: string): Promise<IDonation | undefined> {
    const cmd = new GetCommand({
      TableName: this.table,
      Key: this.key(id),
    });
    const i = await dbc.send(cmd).then(({ Item: i }) => i);
    if (i) return this.sans_keys(i);

    return this.get_by_id_v1(id);
  }

  async get_by_id_v1(id_v1: string): Promise<IDonation | undefined> {
    const q = new QueryCommand({
      TableName: this.table,
      IndexName: Don2Db.gsi1,
      Limit: 1,
      KeyConditionExpression: "gsi1PK = :pk AND gsi1SK = :sk",
      ExpressionAttributeValues: {
        ":pk": this.gsi1_legacy_key(id_v1).gsi1PK,
        ":sk": this.gsi1_legacy_key(id_v1).gsi1SK,
      },
    });
    const { Items: is = [] } = await dbc.send(q);
    const i = is[0];
    return i && this.sans_keys(i);
  }

  async dons_from(
    from_email: string,
    opts?: IDonsFromOpts
  ): Promise<IDonsFromPage> {
    const { limit = 10, next, status = "intent" } = opts || {};
    const q = new QueryCommand({
      TableName: this.table,
      IndexName: Don2Db.gsi2,
      Limit: limit,
      ExclusiveStartKey: this.key_to_obj(next),
      // show most recent first
      ScanIndexForward: false,
      KeyConditionExpression: "gsi2PK = :pk and begins_with(gsi2SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": this.gsi2_dons_from_pk(from_email),
        ":sk": status_flags[status],
      },
    });
    return dbc.send(q).then(this.to_page<IDonation>);
  }

  update_build(ulid: string, data: IDonationUpdate): UpdateBuilder {
    const builder = new UpdateBuilder();
    for (const [k, v] of Object.entries(data)) {
      builder.set(k, v);
    }
    if (data.from_email) {
      builder.set("gsi2PK", this.gsi2_dons_from_pk(data.from_email));
    }
    if (data.status) {
      builder.set("gsi2SK", this.gsi2_dons_from_sk(ulid, data.status));
    }
    builder.set("updated_at" satisfies K, new Date().toISOString());

    return builder;
  }

  async update(id: string, data: IDonationUpdate): Promise<IDonation> {
    const bld = this.update_build(id, data);
    const cmd = new UpdateCommand({
      TableName: this.table,
      Key: this.key(id),
      ReturnValues: "ALL_NEW",
      ConditionExpression: "attribute_exists(PK)",
      ...bld.collect(),
    });
    return dbc.send(cmd).then(({ Attributes: a }) => this.sans_keys(a as any));
  }

  update_txi(id: string, data: IDonationUpdate): TxType["Update"] {
    const bld = this.update_build(id, data);
    for (const [k, v] of Object.entries(data)) {
      bld.set(k, v);
    }
    return {
      TableName: this.table,
      Key: this.key(id),
      ConditionExpression: "attribute_exists(PK)",
      ...bld.collect(),
    };
  }
}
