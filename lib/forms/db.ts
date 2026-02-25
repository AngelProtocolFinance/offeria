import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Db, type TxType, UpdateBuilder, dbc } from "../db";
import type { IForm, IOwnerFormsPage, IOwnerFormsPageOpts } from "./interfaces";

export class FormsDb extends Db {
  form_key(id: string) {
    return {
      PK: `Form#${id}#${this.env}`,
      SK: `Form#${id}#${this.env}`,
    } as const;
  }

  form_owner_gsi1_pk(owner: string) {
    return `OwnerForms#${owner}#${this.env}`;
  }

  form_owner_gsi1(owner: string, date: string) {
    return { gsi1PK: this.form_owner_gsi1_pk(owner), gsi1SK: date } as const;
  }

  form_record(data: IForm) {
    return {
      ...this.form_key(data.id),
      ...this.form_owner_gsi1(data.owner, data.date_created),
      ...data,
    } satisfies IForm;
  }

  async form_get(id: string): Promise<IForm | undefined> {
    const cmd = new GetCommand({
      TableName: this.table,
      Key: this.form_key(id),
    });
    return dbc.send(cmd).then(({ Item: i }) => i && this.sans_keys(i));
  }

  async form_put(data: IForm): Promise<IForm> {
    const cmd = new PutCommand({
      TableName: this.table,
      Item: this.form_record(data),
    });
    await dbc.send(cmd);
    return data;
  }

  form_del_txi(id: string): TxType["Delete"] {
    return {
      TableName: this.table,
      Key: this.form_key(id),
    };
  }

  async form_update(id: string, update: Omit<Partial<IForm>, "id">) {
    const upd8 = new UpdateBuilder();
    for (const [key, value] of Object.entries(update)) {
      upd8.set(key, value);
    }
    const cmd = new UpdateCommand({
      TableName: this.table,
      Key: this.form_key(id),
      ...upd8.collect(),
    });
    return dbc.send(cmd);
  }

  form_ltd_inc_txi(id: string, amount: number): TxType["Update"] {
    return {
      TableName: this.table,
      Key: this.form_key(id),
      UpdateExpression:
        "SET #a = if_not_exists(#a, :zero) + :inc, #b = if_not_exists(#b, :zero) + :one",
      ExpressionAttributeValues: {
        ":inc": amount,
        ":one": 1,
        ":zero": 0,
      },
      ExpressionAttributeNames: {
        "#a": "ltd" satisfies keyof IForm,
        "#b": "ltd_count" satisfies keyof IForm,
      },
    };
  }
  async forms_owned_by(
    owner: string,
    opts?: IOwnerFormsPageOpts
  ): Promise<IOwnerFormsPage> {
    const q = new QueryCommand({
      TableName: this.table,
      IndexName: "gsi1",
      KeyConditionExpression: "gsi1PK = :gsi1PK",
      ExclusiveStartKey: this.key_to_obj(opts?.next),
      Limit: opts?.limit,
      ExpressionAttributeValues: {
        ":gsi1PK": this.form_owner_gsi1_pk(owner),
      },
    });
    return dbc.send(q).then(this.to_page<IForm>);
  }
}
