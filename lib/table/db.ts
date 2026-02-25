import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { Db, dbc } from "../db";
import type { ICurrencyFvMap, TEquivalent } from "./interfaces";

/** general purpose table */
export class Table extends Db {
  key_currency_map(to: TEquivalent) {
    return { PK: `CurrencyMap#${to}`, SK: `CurrencyMap#${to}` };
  }

  async currency_map(to: TEquivalent): Promise<ICurrencyFvMap> {
    const cmd = new GetCommand({
      TableName: this.table,
      Key: this.key_currency_map(to),
    });
    return dbc.send(cmd).then(({ Item: i }) => this.sans_keys(i!));
  }

  async currency_map_put(data: ICurrencyFvMap, to: TEquivalent) {
    const cmd = new PutCommand({
      TableName: this.table,
      Item: {
        ...this.key_currency_map(to),
        ...data,
      },
    });
    await dbc.send(cmd).then((res) => res.Attributes);
  }
}
