import {
  GetCommand,
  PutCommand,
  QueryCommand,
  type QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { Db, type TxType, UpdateBuilder, dbc } from "../db";
import type {
  IBalanceTx,
  IBalanceTxsPage,
  IBalanceTxsPageOptions,
  IPageOptions,
  TAccount,
  TStatus,
} from "./interfaces";

export class BalanceTxsDb extends Db {
  static readonly gsi1 = "gsi1";
  static readonly gsi2 = "gsi2";
  static readonly gsi3 = "gsi3";

  key_tx(id: string) {
    return { PK: `Tx#${id}`, SK: `Tx#${id}` } as const;
  }

  gsi1_txs_pk(status: TStatus) {
    return `Txs#${this.env}#${status}` as const;
  }
  gsi3_txs_pk(acc: TAccount, status: TStatus) {
    return `Txs#${this.env}#${acc}#${status}` as const;
  }
  gsi3_txs_key(date: string, acc: TAccount, status: TStatus) {
    return {
      gsi3PK: this.gsi3_txs_pk(acc, status),
      gsi3SK: date,
    } as const;
  }

  gsi1_txs_key(date: string, status: TStatus) {
    return {
      gsi1PK: this.gsi1_txs_pk(status),
      gsi1SK: date,
    } as const;
  }
  gsi2_owner_txs_key(owner: string, date: string, account: TAccount) {
    return {
      gsi2PK: `OwnerTxs#${owner}#${this.env}#${account}`,
      gsi2SK: date,
    } as const;
  }

  /** for db transactions */
  tx_record(data: IBalanceTx) {
    return {
      ...this.key_tx(data.id),
      ...this.gsi1_txs_key(data.date_created, data.status),
      ...this.gsi2_owner_txs_key(data.owner, data.date_created, data.account),
      ...this.gsi3_txs_key(data.date_created, data.account, data.status),
      ...data,
      env: this.env,
    };
  }
  tx_put_txi(data: IBalanceTx): TxType["Put"] {
    return {
      TableName: this.table,
      Item: this.tx_record(data),
    };
  }
  /** dashboard withdraw/transfer */
  async tx_put(data: IBalanceTx) {
    const cmd = new PutCommand({
      TableName: this.table,
      Item: this.tx_record(data),
    });
    return dbc.send(cmd).then(() => data);
  }

  /** npo dashboard */
  async owner_txs(
    owner_id: string,
    account: TAccount,
    opts?: IPageOptions
  ): Promise<IBalanceTxsPage> {
    const cmd = new QueryCommand({
      TableName: this.table,
      IndexName: "gsi2",
      Limit: opts?.limit,
      KeyConditionExpression: "gsi2PK = :gsi2PK",
      ExclusiveStartKey: this.key_to_obj(opts?.next),
      ExpressionAttributeValues: {
        ":gsi2PK": this.gsi2_owner_txs_key(owner_id, "sk-not-used", account)
          .gsi2PK,
      },
      ScanIndexForward: false,
    });
    return dbc.send(cmd).then(this.to_page<IBalanceTx>);
  }

  async tx(id: string) {
    const cmd = new GetCommand({
      TableName: this.table,
      Key: this.key_tx(id),
      ConsistentRead: true,
    });
    const res = await dbc.send(cmd);
    return res.Item ? (this.sans_keys(res.Item) as IBalanceTx) : undefined;
  }

  async tx_update_status_txi(
    tx: IBalanceTx,
    status: TStatus
  ): Promise<TxType["Update"]> {
    const x = new UpdateBuilder();
    x.set("status", status);
    x.set("gsi1PK", this.gsi1_txs_pk(status));
    x.set("gsi3PK", this.gsi3_txs_pk(tx.account, status));
    return {
      TableName: this.table,
      Key: this.key_tx(tx.id),
      ...x.collect(),
    };
  }

  /** finance dashboard */
  async txs({
    limit = 10,
    next,
    status = "pending",
    acc = "lock",
  }: IBalanceTxsPageOptions = {}): Promise<IBalanceTxsPage> {
    const input: QueryCommandInput = {
      TableName: this.table,
      IndexName: BalanceTxsDb.gsi3,
      Limit: limit,
      KeyConditionExpression: "gsi3PK = :gsi3PK",
      ExclusiveStartKey: this.key_to_obj(next),
      ExpressionAttributeValues: {
        ":gsi3PK": this.gsi3_txs_pk(acc, status),
      },
      ScanIndexForward: false,
    };

    const cmd = new QueryCommand(input);
    return dbc.send(cmd).then(this.to_page<IBalanceTx>);
  }
}

export interface IBalanceTxDb
  extends IBalanceTx,
    ReturnType<BalanceTxsDb["key_tx"]>,
    ReturnType<BalanceTxsDb["gsi1_txs_key"]>,
    ReturnType<BalanceTxsDb["gsi2_owner_txs_key"]>,
    ReturnType<BalanceTxsDb["gsi3_txs_key"]> {}
