import type { TransactWriteCommandInput } from "@aws-sdk/lib-dynamodb";

export type TxItems = NonNullable<TransactWriteCommandInput["TransactItems"]>;
export type TxType = NonNullable<TxItems[number]>;
export class Txs {
  private items: TxItems = [];

  put(item: TxType["Put"]) {
    this.items.push({ Put: item });
    return this;
  }

  del(item: TxType["Delete"]) {
    this.items.push({ Delete: item });
    return this;
  }

  update(item: TxType["Update"]) {
    this.items.push({ Update: item });
    return this;
  }

  append(items: TxItems) {
    this.items.push(...items);
    return this;
  }

  get all(): TxItems {
    return this.items;
  }
}
