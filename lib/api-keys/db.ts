import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { Db, dbc } from "../db";
import type { Environment } from "../types/list";
import type { IApiKeyPayload } from "./interfaces";

export class ApiKeysDb extends Db {
  private encryption_key: Buffer;

  constructor(table: string, env: Environment, encryption_key: Buffer) {
    super(table, env);
    this.encryption_key = encryption_key;
  }

  key(npoId: number) {
    return { PK: `Zapier#${npoId}`, SK: this.env } as const;
  }

  async put(npoId: number): Promise<string> {
    const payload: IApiKeyPayload = {
      npoId,
      env: this.env,
      timestamp: Date.now(),
    };

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(
      "aes-256-gcm",
      this.encryption_key,
      iv
    );
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(payload), "utf8"),
      cipher.final(),
    ]);
    const auth_tag = cipher.getAuthTag();

    const combined = Buffer.concat([iv, encrypted, auth_tag]);
    const api_key = combined.toString("base64url");

    const cmd = new PutCommand({
      TableName: this.table,
      Item: {
        ...this.key(npoId),
        apiKey: api_key,
        ...payload,
      },
    });
    await dbc.send(cmd);
    return api_key;
  }

  async get(npoId: number): Promise<string | undefined> {
    const cmd = new GetCommand({
      TableName: this.table,
      Key: this.key(npoId),
    });
    return dbc.send(cmd).then((res) => res.Item?.apiKey);
  }

  decode(api_key: string): IApiKeyPayload {
    const combined = Buffer.from(api_key, "base64url");

    const iv = combined.subarray(0, 12);
    const auth_tag = combined.subarray(combined.length - 16);
    const encrypted = combined.subarray(12, combined.length - 16);

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      this.encryption_key,
      iv
    );
    decipher.setAuthTag(auth_tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString("utf8"));
  }
}
