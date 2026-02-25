import crypto from "node:crypto";
import {
  BatchGetCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import KSUID from "ksuid";
import {
  Db,
  type TxItems,
  type TxType,
  Txs,
  UpdateBuilder,
  type UpdateComps,
  dbc,
} from "../db";
import { projection } from "../db/helpers";
import type {
  IMedia,
  IMediaDb,
  IMediaPage,
  INpoReferredBy,
  INpoWithKeyword,
  INpoWithRegNum,
  INpoWithRid,
  TBinFlag,
  TNpoDbKeys,
  TNpoDbProjectedTo,
} from "./interfaces";
import { med_key_filter, med_sk, to_imedia } from "./media";
import { npo_fields } from "./npo";
import type {
  IMediaSearchObj,
  IMediaUpdate,
  IMilestone,
  IMilestoneNew,
  IMilestoneUpdate,
  INpo,
  INpoUpdate,
  IProgram,
  IProgramDb,
  IProgramNew,
  IProgramUpdate,
  TMediaType,
} from "./schema";

export class NpoDb extends Db {
  static readonly slug_env_gsi = "slug-env-gsi" as const;
  static readonly regnum_env_gsi = "regnum-env-gsi" as const;
  static readonly keyword_env_gsi = "keyword-env-gsi" as const;
  key_npo(id: number) {
    return {
      PK: `Endow#${id}`,
      SK: this.env,
    };
  }
  get key_count() {
    return {
      PK: "Count",
      SK: this.env,
    };
  }
  key_npo_program(id: string, npo: number) {
    return {
      PK: `Endow#${npo}#${this.env}`,
      SK: `Prog#${id}`,
    };
  }

  key_prog_milestone(id: string, prog: string) {
    return {
      PK: `Prog#${prog}#${this.env}`,
      SK: `Mile#${id}`,
    };
  }

  key_npo_med(ksuid: string, npo: number) {
    return {
      PK: `Endow#${npo}#${this.env}`,
      SK: `Media#${ksuid}`,
    };
  }

  gsi1_npo_ref_by_key(id: string) {
    return {
      gsi1PK: `ReferredBy#${id}`,
      gsi1SK: this.env,
    };
  }

  gsi2_npo_w_rid_key(id: string) {
    return {
      gsi2PK: `Rid#${id}`,
      gsi2SK: `Rid#${id}`,
    };
  }

  gsi1_npo_med(id: string, npo: number, featured: TBinFlag, type: TMediaType) {
    return {
      gsi1PK: this.key_npo_med(id, npo).PK,
      gsi1SK: med_sk(id, type, featured),
    };
  }

  async npos_get<T extends TNpoDbKeys[]>(
    ids: number[],
    fields: T = Object.keys(npo_fields) as T
  ): Promise<TNpoDbProjectedTo<T>[]> {
    if (ids.length === 0) return [];
    const { names, expression } = projection(fields);
    const cmd = new BatchGetCommand({
      RequestItems: {
        [this.table]: {
          Keys: ids.map((id) => this.key_npo(id)),
          ProjectionExpression: expression,
          ExpressionAttributeNames: names,
        },
      },
    });
    const { Responses } = await dbc.send(cmd);
    const x = Responses?.[this.table] ?? [];
    return x.map((i) => this.sans_keys(i));
  }

  async npo_count_inc(): Promise<number> {
    const cmd = new UpdateCommand({
      TableName: this.table,
      Key: this.key_count,
      UpdateExpression: "SET #count = if_not_exists(#count, :zero) + :one",
      ExpressionAttributeNames: {
        "#count": "count",
      },
      ExpressionAttributeValues: { ":zero": 0, ":one": 1 },
      ReturnValues: "UPDATED_NEW",
    });
    const res = await dbc.send(cmd);
    return res.Attributes?.count ?? 1;
  }

  async npo_media(npo: number, opts: IMediaSearchObj): Promise<IMediaPage> {
    const PK: string = this.key_npo_med("ksuid-sk", npo).PK;
    const [expression, values] = med_key_filter(PK, opts);

    const cmd = new QueryCommand({
      TableName: this.table,
      IndexName: "gsi1",
      Limit: opts.limit,
      KeyConditionExpression: expression,
      ExpressionAttributeValues: values,
      ExclusiveStartKey: this.key_to_obj(opts.next),
    });

    const res = await dbc.send(cmd);
    const page = this.to_page(res, to_imedia);
    return page;
  }

  async npo_referred_by(id: string): Promise<INpoReferredBy[]> {
    const cmd = new QueryCommand({
      TableName: this.table,
      IndexName: "gsi1",
      KeyConditionExpression: "#pk = :pk",
      ExpressionAttributeValues: {
        ":pk": this.gsi1_npo_ref_by_key(id).gsi1PK,
      },
      ExpressionAttributeNames: { "#pk": "gsi1PK" },
    });
    const { Items = [] } = await dbc.send(cmd);
    return Items.map((x) => this.sans_keys(x));
  }

  async npo_with_rid(id: string): Promise<INpoWithRid | undefined> {
    const cmd = new QueryCommand({
      TableName: this.table,
      IndexName: "gsi2",
      KeyConditionExpression: "gsi2PK = :pk",
      ExpressionAttributeValues: {
        ":pk": this.gsi2_npo_w_rid_key(id).gsi2PK,
      },
      Limit: 1,
    });
    const { Items = [] } = await dbc.send(cmd);
    const i = Items[0];
    return i && this.sans_keys(i);
  }
  async npo_with_keyword(
    keyword: string
  ): Promise<INpoWithKeyword | undefined> {
    const cmd = new QueryCommand({
      TableName: this.table,
      IndexName: NpoDb.keyword_env_gsi,
      KeyConditionExpression: "#kw = :kw AND #env = :env",
      ExpressionAttributeNames: {
        "#kw": "keyword" satisfies TNpoDbKeys,
        "#env": "env" satisfies TNpoDbKeys,
      },
      ExpressionAttributeValues: {
        ":kw": keyword,
        ":env": this.env,
      },
      Limit: 1,
    });

    const { Items = [] } = await dbc.send(cmd);
    const i = Items[0];
    return i && this.sans_keys(i);
  }

  async npo_with_regnum(
    regnum: string,
    country = "United States"
  ): Promise<INpoWithRegNum | undefined> {
    const cmd = new QueryCommand({
      TableName: this.table,
      IndexName: NpoDb.regnum_env_gsi,
      Limit: 1,
      KeyConditionExpression: "#rn = :rn AND #env = :env",

      FilterExpression: "#country = :country",
      ExpressionAttributeNames: {
        "#rn": "registration_number" satisfies TNpoDbKeys,
        "#env": "env" satisfies TNpoDbKeys,
        "#country": "hq_country" satisfies TNpoDbKeys,
      },
      ExpressionAttributeValues: {
        ":rn": regnum,
        ":env": this.env,
        ":country": country,
      },
    });

    const { Items = [] } = await dbc.send(cmd);
    const i = Items[0];
    return i && this.sans_keys(i);
  }

  npo_record(data: INpo) {
    return {
      ...this.key_npo(data.id),
      ...data,
      ...(data.referrer ? this.gsi1_npo_ref_by_key(data.referrer) : {}),
      ...(data.referral_id ? this.gsi2_npo_w_rid_key(data.referral_id) : {}),
    };
  }

  npo_put_txi(data: INpo): TxType["Put"] {
    return {
      TableName: this.table,
      Item: this.npo_record(data),
    };
  }

  npo_prog_record(npo: number, data: IProgramDb) {
    return {
      ...this.key_npo_program(data.id, npo),
      ...data,
    };
  }

  prog_milestone_record(prog: string, data: IMilestoneNew) {
    const mid = crypto.randomUUID();
    return {
      ...this.key_prog_milestone(mid, prog),
      ...data,
      id: mid,
    } satisfies IMilestone;
  }

  npo_med_record(
    npo_id: number,
    { featured /** not saved as attribute  */, ...d }: IMedia
  ) {
    return {
      ...this.key_npo_med(d.id, npo_id),
      ...this.gsi1_npo_med(d.id, npo_id, featured ? "1" : "0", d.type),
      ...(d satisfies IMediaDb),
    };
  }

  async npo_med_put(npo: number, url: string) {
    const ksuid = KSUID.randomSync();
    const mid = ksuid.string;
    const item = this.npo_med_record(npo, {
      id: mid,
      url,
      type: "video",
      dateCreated: ksuid.date.toISOString(),
      featured: false,
    });
    const command = new PutCommand({
      TableName: this.table,
      Item: item,
    });
    await dbc.send(command);
    return mid;
  }

  async npo_med(npo: number, mid: string): Promise<IMedia | undefined> {
    const cmd = new GetCommand({
      TableName: this.table,
      Key: this.key_npo_med(mid, npo),
    });
    const { Item: i } = await dbc.send(cmd);
    return i && to_imedia(i);
  }

  async npo_med_update(npo: number, prev: IMedia, update: IMediaUpdate) {
    const new_sk = med_sk(
      prev.id,
      prev.type,
      (update.featured ?? prev.featured) ? "0" : "1"
    );

    const cmd = new UpdateCommand({
      TableName: this.table,
      Key: this.key_npo_med(prev.id, npo),
      UpdateExpression: "SET #url = :url, gsi1SK = :gsi1SK",
      ExpressionAttributeNames: { "#url": "url" },
      ExpressionAttributeValues: {
        ":url": update.url ?? prev.url,
        ":gsi1SK": new_sk,
      },
      ReturnValues: "ALL_NEW",
    });
    return dbc.send(cmd).then((res) => res.Attributes ?? {});
  }

  async npo_med_delete(npo: number, mid: string) {
    const cmd = new DeleteCommand({
      TableName: this.table,
      Key: this.key_npo_med(mid, npo),
    });
    return dbc.send(cmd);
  }

  async npo<T extends TNpoDbKeys[]>(
    id: string | number,
    fields: T = Object.keys(npo_fields) as T
  ): Promise<TNpoDbProjectedTo<T> | undefined> {
    const { names, expression } = projection(fields);

    if (typeof id === "string") {
      const cmd = new QueryCommand({
        TableName: this.table,
        IndexName: NpoDb.slug_env_gsi,
        KeyConditionExpression: "#slug = :slug and #env = :env",
        ExpressionAttributeValues: {
          ":slug": id,
          ":env": this.env,
        },
        ProjectionExpression: expression,
        ExpressionAttributeNames: {
          ...names,
          "#env": "env",
          "#slug": "slug",
        },
      });
      const [x] = await dbc.send(cmd).then(({ Items: x = [] }) => x);
      return x ? this.sans_keys(x) : undefined;
    }

    const cmd = new GetCommand({
      TableName: this.table,
      Key: this.key_npo(id),
      ProjectionExpression: expression,
      ExpressionAttributeNames: names,
    });
    const { Item: i } = await dbc.send(cmd);
    return i ? this.sans_keys(i) : undefined;
  }

  npo_update_comps({
    target,
    slug,
    social_media_urls,
    ...update
  }: INpoUpdate): UpdateComps {
    const updates = new UpdateBuilder();

    if (slug) updates.set("slug", slug);
    if (slug === "") updates.remove("slug");

    if (social_media_urls) {
      for (const [k, v] of Object.entries(social_media_urls)) {
        if (v === undefined) continue;
        updates.set(`social_media_urls.${k}`, v);
      }
    }

    for (const [k, v] of Object.entries(update)) {
      if (v === undefined) continue;
      updates.set(k, v);
    }

    return updates.collect();
  }

  async npo_update(id: number, update: INpoUpdate) {
    const upd8 = this.npo_update_comps(update);
    const cmd = new UpdateCommand({
      TableName: this.table,
      Key: this.key_npo(id),
      ...upd8,
      ReturnValues: "ALL_NEW",
    });
    return dbc.send(cmd);
  }
  npo_update_txi(id: number, update: INpoUpdate): TxType["Update"] {
    const upd8 = this.npo_update_comps(update);
    return {
      TableName: this.table,
      Key: this.key_npo(id),
      ...upd8,
    };
  }

  async prog_milestones(id: string): Promise<IMilestone[]> {
    const command = new QueryCommand({
      TableName: this.table,
      KeyConditionExpression: "PK = :PK",
      ExpressionAttributeValues: {
        ":PK": this.key_prog_milestone("not-used", id).PK,
      },
    });
    return dbc
      .send(command)
      .then(({ Items: x = [] }) => x.map((i) => this.sans_keys(i)));
  }
  async prog_milestone_delete(pid: string, mid: string) {
    const cmd = new DeleteCommand({
      TableName: this.table,
      Key: this.key_prog_milestone(mid, pid),
    });
    return dbc.send(cmd);
  }
  async prog_milestone_put(
    pid: string,
    content: IMilestoneNew
  ): Promise<string> {
    const item = this.prog_milestone_record(pid, content);
    const cmd = new PutCommand({
      TableName: this.table,
      Item: item,
    });
    return dbc.send(cmd).then(() => item.id);
  }

  async prog_milestone_update(
    pid: string,
    mid: string,
    update: IMilestoneUpdate
  ) {
    const upd8 = new UpdateBuilder();
    for (const [key, value] of Object.entries(update)) {
      upd8.set(key, value);
    }

    const cmd = new UpdateCommand({
      TableName: this.table,
      Key: this.key_prog_milestone(mid, pid),
      ...upd8.collect(),
      ReturnValues: "ALL_NEW",
    });
    return dbc.send(cmd).then((res) => res.Attributes);
  }

  async npo_program(id: string, npo_id: number): Promise<IProgram | undefined> {
    const cmd = new GetCommand({
      TableName: this.table,
      Key: this.key_npo_program(id, npo_id),
    });
    const { Item: p } = await dbc.send(cmd);
    if (!p) return undefined;

    const milestones = await this.prog_milestones(id);

    return {
      ...this.sans_keys<IProgramDb>(p),
      milestones: milestones.toSorted((a, b) => a.date.localeCompare(b.date)),
    };
  }
  async npo_programs(id: number): Promise<IProgramDb[]> {
    const cmd = new QueryCommand({
      TableName: this.table,
      KeyConditionExpression: "PK = :PK and begins_with(SK, :SK)",
      ExpressionAttributeValues: {
        ":PK": this.key_npo_program("not-used", id).PK,
        ":SK": "Prog#",
      },
    });

    const { Items: x = [] } = await dbc.send(cmd);
    return x.map((i) => this.sans_keys(i));
  }

  async npo_program_put(npo: number, content: IProgramNew): Promise<string> {
    const pid = crypto.randomUUID();

    const { milestones, ...prog } = content;
    const txs = new Txs();
    const db_prog = this.npo_prog_record(npo, {
      ...prog,
      id: pid,
      totalDonations: 0,
    });
    txs.put({
      TableName: this.table,
      Item: db_prog,
    });

    for (const m of milestones || []) {
      txs.put({
        TableName: this.table,
        Item: this.prog_milestone_record(pid, m),
      });
    }

    const cmd = new TransactWriteCommand({
      TransactItems: txs.all,
    });

    await dbc.send(cmd);
    return pid;
  }

  async npo_prog_del_txis(npo: number, prog: string): Promise<TxItems> {
    const milestones = await this.prog_milestones(prog);
    const txs = new Txs();
    txs.del({
      TableName: this.table,
      Key: this.key_npo_program(prog, npo),
    });

    for (const m of milestones) {
      txs.del({
        TableName: this.table,
        Key: this.key_prog_milestone(m.id, prog),
      });
    }
    return txs.all;
  }

  npo_prog_contrib_update_txi(
    npo: number,
    prog: string,
    amount: number
  ): TxType["Update"] {
    return {
      TableName: this.table,
      Key: this.key_npo_program(prog, npo),
      UpdateExpression: "SET #x = if_not_exists(#x, :zero) + :amt",
      ExpressionAttributeValues: {
        ":amt": amount,
        ":zero": 0,
      },
      ExpressionAttributeNames: {
        "#x": "totalDonations" satisfies keyof IProgram,
      },
    };
  }

  async npo_prog_del(npo: number, prog: string) {
    const txs = await this.npo_prog_del_txis(npo, prog);
    const cmd = new TransactWriteCommand({
      TransactItems: txs,
    });
    return dbc.send(cmd);
  }

  async npo_prog_update(npo: number, prog: string, update: IProgramUpdate) {
    const upd8 = new UpdateBuilder();
    for (const [key, value] of Object.entries(update)) {
      upd8.set(key, value);
    }

    const cmd = new UpdateCommand({
      TableName: this.table,
      Key: this.key_npo_program(prog, npo),
      ...upd8.collect(),
      ReturnValues: "ALL_NEW",
    });
    return dbc.send(cmd).then((res) => res.Attributes);
  }
}
