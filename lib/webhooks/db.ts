import crypto from "node:crypto";
import { DeleteCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { Db, dbc } from "../db";

export class WebhooksDb extends Db {
  key(npoId: number, id: string) {
    return { PK: `Zapier#${this.env}#${npoId}`, SK: id } as const;
  }

  async save(hook_url: string, npo_id: number): Promise<string> {
    const id = crypto.randomUUID();
    const cmd = new PutCommand({
      TableName: this.table,
      Item: {
        ...this.key(npo_id, id),
        id,
        npoId: npo_id,
        env: this.env,
        url: hook_url,
      },
    });
    await dbc.send(cmd);
    return id;
  }

  async del(id: string, npo_id: number) {
    const cmd = new DeleteCommand({
      TableName: this.table,
      Key: this.key(npo_id, id),
    });
    return dbc.send(cmd);
  }
}
