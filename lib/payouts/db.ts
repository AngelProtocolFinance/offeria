import { QueryCommand, type QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { Db, type TxType, UpdateBuilder, dbc } from "../db";
import type {
  INpoPayoutsOptions,
  INpoPayoutsPage,
  INpoSettlementsOptions,
  INpoSettlementsPage,
  IPayout,
  IPayoutUpdate,
  IPendingStatus,
  ISettlement,
  ISettlementUpdate,
  PayoutStatus,
} from "./interfaces";

export class PayoutsDB extends Db {
  key_payout(id: string) {
    return { PK: `Payout#${id}`, SK: `Payout#${id}` };
  }

  key_settlement(id: string) {
    return { PK: `Settlement#${id}`, SK: `Settlement#${id}` };
  }

  gsi1_npo_payouts(npo_id: string, date: string) {
    return {
      gsi1PK: `NpoPayouts#${npo_id}#${this.env}`,
      gsi1SK: date,
    };
  }

  gsi1_npo_settlements(npo_id: string, date: string) {
    return {
      gsi1PK: `NpoSettlements#${npo_id}#${this.env}`,
      gsi1SK: date,
    };
  }

  gsi2_payouts_with_status(status: PayoutStatus["type"], date: string) {
    return {
      gsi2PK: `PayoutsWithStatus#${status}#${this.env}`,
      gsi2SK: date,
    };
  }

  payout_record(data: IPayout) {
    return {
      ...this.key_payout(data.id),
      ...this.gsi1_npo_payouts(data.recipient_id, data.date),
      ...this.gsi2_payouts_with_status(data.type, data.date),
      ...data,
    };
  }

  payout_put_txi(data: IPayout): TxType["Put"] {
    return { TableName: this.table, Item: this.payout_record(data) };
  }

  settlement_record(data: ISettlement) {
    return {
      ...this.key_settlement(data.id),
      ...this.gsi1_npo_settlements(data.recipient_id, data.date),
      ...data,
    };
  }
  settlement_put_txi(data: ISettlement): TxType["Put"] {
    return { TableName: this.table, Item: this.settlement_record(data) };
  }

  settlement_update_txi(
    id: string,
    update: ISettlementUpdate
  ): TxType["Update"] {
    const upd8 = new UpdateBuilder();
    for (const [key, value] of Object.entries(update)) {
      upd8.set(key, value);
    }
    return {
      TableName: this.table,
      Key: this.key_settlement(id),
      ...upd8.collect(),
    };
  }
  payout_update_txi<T extends PayoutStatus>(
    id: string,
    update: IPayoutUpdate<T>
  ): TxType["Update"] {
    const upd8 = new UpdateBuilder();
    for (const [key, value] of Object.entries(update)) {
      upd8.set(key, value);
    }
    if (update.type) {
      upd8.set(
        "gsi2PK",
        this.gsi2_payouts_with_status(update.type, "not-used").gsi2PK
      );
    }
    return {
      TableName: this.table,
      Key: this.key_payout(id),
      ...upd8.collect(),
    };
  }

  /** npo dashboard */
  async npo_payouts(
    npo_id: string,
    opts: INpoPayoutsOptions
  ): Promise<INpoPayoutsPage> {
    const cmd = new QueryCommand({
      TableName: this.table,
      IndexName: "gsi1",
      Limit: opts.limit,
      KeyConditionExpression: "gsi1PK = :gsi1PK",
      FilterExpression: opts.status ? "#status = :status" : undefined,
      ExclusiveStartKey: this.key_to_obj(opts.next),
      ExpressionAttributeValues: {
        ":gsi1PK": this.gsi1_npo_payouts(npo_id, "sk-not-used").gsi1PK,
        ...(opts.status ? { ":status": opts.status } : {}),
      },
      ExpressionAttributeNames: opts.status ? { "#status": "type" } : undefined,
      ScanIndexForward: false,
    });
    return dbc.send(cmd).then(this.to_page<IPayout>);
  }

  async npo_settlements(
    npo_id: string,
    opts: INpoSettlementsOptions
  ): Promise<INpoSettlementsPage> {
    const cmd = new QueryCommand({
      TableName: this.table,
      IndexName: "gsi1",
      Limit: opts.limit,
      KeyConditionExpression: "gsi1PK = :gsi1PK",
      ExclusiveStartKey: this.key_to_obj(opts.next),
      ExpressionAttributeValues: {
        ":gsi1PK": this.gsi1_npo_settlements(npo_id, "sk-not-used").gsi1PK,
      },
      ScanIndexForward: false,
    });
    return dbc.send(cmd).then(this.to_page<ISettlement>);
  }

  /** use by payout processor */
  async pending_payouts(): Promise<IPayout<IPendingStatus>[]> {
    const input: QueryCommandInput = {
      TableName: this.table,
      IndexName: "gsi2",
      KeyConditionExpression: "gsi2PK = :gsi2PK",
      ExpressionAttributeValues: {
        ":gsi2PK": this.gsi2_payouts_with_status("pending", "not-used").gsi2PK,
      },
      ScanIndexForward: false,
    };
    return this.exhaust(
      QueryCommand,
      input,
      this.sans_keys<IPayout<IPendingStatus>>
    );
  }
}
