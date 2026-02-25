import { Buffer } from "node:buffer";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  type QueryCommand,
  type QueryCommandOutput,
  type ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import type { IPageKeyed } from "../types/api";
import type { Environment } from "../types/list";
import type { IKeys, TRecord } from "./types";

type Cmd = typeof QueryCommand | typeof ScanCommand;

export const dbc = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export class Db {
  env: Environment;
  table: string;
  constructor(table: string, env: Environment) {
    this.table = table;
    this.env = env;
  }

  //biome-ignore format:
  extract_keys = <T,>({ PK, SK, gsi1PK, gsi1SK, gsi2PK, gsi2SK, gsi3PK, gsi3SK, gsi4PK, gsi4SK, gsi5PK, gsi5SK, ...rest }: TRecord): [IKeys, T] => {
    return [ { PK, SK, gsi1PK, gsi1SK, gsi2PK, gsi2SK, gsi3PK, gsi3SK, gsi4PK, gsi4SK, gsi5PK, gsi5SK }, rest as T];
  };
  //biome-ignore format:
  sans_keys = <T,>(r: TRecord): T => {
    const [, rest] = this.extract_keys<T>(r);
    return rest
  };

  key_to_base64(obj_key: TRecord | undefined): string | undefined {
    return obj_key
      ? Buffer.from(JSON.stringify(obj_key)).toString("base64")
      : undefined;
  }
  key_to_obj(str_key: string | undefined): TRecord | undefined {
    return str_key
      ? JSON.parse(Buffer.from(str_key, "base64").toString())
      : undefined;
  }

  //biome-ignore format:
  to_items = <T,>(
    { Items = [] }: QueryCommandOutput,
    formatter?: (item: TRecord) => T
  ): T[] => {
    return Items.map(formatter || this.sans_keys<T>);
  };

  //biome-ignore format:
  to_page = <T,>(
    { LastEvaluatedKey, Items = [] }: QueryCommandOutput,
    formatter?: (item: TRecord) => T
  ): IPageKeyed<T> => {
    return {
      items: Items.map(formatter || this.sans_keys<T>),
      next: this.key_to_base64(LastEvaluatedKey),
    };
  };

  async exhaust<T extends Cmd, K>(
    Cmd: T,
    input: Omit<ConstructorParameters<T>[0], "ExclusiveStartKey">,
    formatter: (item: TRecord) => K
  ): Promise<K[]> {
    const items: K[] = [];
    let next: TRecord | undefined;
    do {
      const cmd = new Cmd({
        ...input,
        ExclusiveStartKey: next,
      });
      const { Items = [], LastEvaluatedKey: k } = await dbc.send(cmd);
      items.push(...Items.map(formatter));
      next = k;
    } while (next);
    return items;
  }
}
