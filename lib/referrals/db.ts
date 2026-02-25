import {
  GetCommand,
  PutCommand,
  QueryCommand,
  type QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { Db, type TxType, dbc } from "../db";
import type {
  ICommission,
  ILtd,
  IPayout,
  IPayoutLtd,
  TStatus,
} from "./interface";

export class ReferralsDb extends Db {
  static readonly gsi1 = "gsi1";

  key_ltd(id: string) {
    return { PK: `Ltd#${id}`, SK: `Ltd#${id}` } as const;
  }

  key_commission_pk(referrer: string) {
    return `Cm#${referrer}` as const;
  }

  key_commission(referrer: string, date: string) {
    return { PK: this.key_commission_pk(referrer), SK: date } as const;
  }

  key_payout_pk(id: string) {
    return `Po#${id}` as const;
  }
  key_payout_key(id: string, date: string) {
    return { PK: `Po#${id}`, SK: date } as const;
  }

  key_payout_ltd(id: string) {
    return { PK: `PoLtd#${id}`, SK: `PoLtd#${id}` } as const;
  }

  gsi1_commissions_pk() {
    return `Cms#${this.env}` as const;
  }

  gsi1_commissions_key(status: TStatus) {
    return {
      gsi1PK: this.gsi1_commissions_pk(),
      gsi1SK: status,
    } as const;
  }

  /** Query commissions by status with pagination */
  async commissions(status: TStatus, opts?: { next?: string; limit?: number }) {
    const cmd = new QueryCommand({
      TableName: this.table,
      IndexName: ReferralsDb.gsi1,
      KeyConditionExpression: "#pk = :pk AND #sk = :sk",
      ExpressionAttributeNames: {
        "#pk": "gsi1PK",
        "#sk": "gsi1SK",
      },
      ExpressionAttributeValues: {
        ":pk": this.gsi1_commissions_pk(),
        ":sk": status,
      },
      Limit: opts?.limit,
      ExclusiveStartKey: this.key_to_obj(opts?.next),
    });

    return dbc.send(cmd).then(this.to_page<ICommission>);
  }

  /** Fetch all commissions by status (auto-paginates) */
  commissions_all(status: TStatus) {
    const q: QueryCommandInput = {
      TableName: this.table,
      IndexName: ReferralsDb.gsi1,
      KeyConditionExpression: "#pk = :pk AND #sk = :sk",
      ExpressionAttributeNames: {
        "#pk": "gsi1PK",
        "#sk": "gsi1SK",
      },
      ExpressionAttributeValues: {
        ":pk": this.gsi1_commissions_pk(),
        ":sk": status,
      },
    };

    return this.exhaust(QueryCommand, q, (item) =>
      this.sans_keys<ICommission>(item)
    );
  }

  async get_ltd(id: string): Promise<ILtd | undefined> {
    const cmd = new GetCommand({
      TableName: this.table,
      Key: this.key_ltd(id),
    });
    return dbc.send(cmd).then(({ Item: i }) => i && this.sans_keys<ILtd>(i));
  }

  async pending_earnings(id: string): Promise<number> {
    const cmd = new QueryCommand({
      TableName: this.table,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": this.key_commission_pk(id),
        ":status": "pending" satisfies TStatus,
      },
      FilterExpression: "#status = :status",
      ExpressionAttributeNames: { "#status": "status" },
    });

    const coms = await dbc
      .send(cmd)
      .then(({ Items: x = [] }) => x as ICommission[]);
    return coms.reduce((acc, { amount }) => acc + amount, 0);
  }

  async payouts(id: string, opts?: { next?: string; limit?: number }) {
    const cmd = new QueryCommand({
      TableName: this.table,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": this.key_payout_pk(id) },
      ScanIndexForward: false,
      Limit: opts?.limit ?? 10,
      ExclusiveStartKey: this.key_to_obj(opts?.next),
    });

    const res = await dbc.send(cmd);
    return this.to_page<IPayout>(res);
  }

  async payout_ltd(id: string): Promise<number> {
    const cmd = new GetCommand({
      TableName: this.table,
      Key: this.key_payout_ltd(id),
    });

    const res = await dbc
      .send(cmd)
      .then((x) => x.Item as IPayoutLtd | undefined);
    return res?.amount ?? 0;
  }

  // Transaction item builders
  payout_record(data: IPayout): IPayout {
    return {
      ...this.key_payout_key(data.referrer, data.date),
      ...data,
    };
  }

  payout_put_txi(data: IPayout): TxType["Put"] {
    return {
      TableName: this.table,
      Item: this.payout_record(data),
    };
  }

  async payout_put(data: IPayout) {
    const cmd = new PutCommand({
      TableName: this.table,
      Item: this.payout_record(data),
    });
    return dbc.send(cmd);
  }

  commission_update_status_txi(
    commission: ICommission,
    status: TStatus
  ): TxType["Update"] {
    return {
      TableName: this.table,
      Key: this.key_commission(commission.referrer, commission.date),
      UpdateExpression: "SET #status = :status, gsi1SK = :gsi1SK",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":status": status, ":gsi1SK": status },
    };
  }

  payout_ltd_update_txi(referrer_id: string, amount: number): TxType["Update"] {
    return {
      TableName: this.table,
      Key: this.key_payout_ltd(referrer_id),
      UpdateExpression: "SET #amount = if_not_exists(#amount, :zero) + :amount",
      ExpressionAttributeNames: { "#amount": "amount" },
      ExpressionAttributeValues: { ":zero": 0, ":amount": amount },
    };
  }

  /** Build commission record with keys */
  commission_record(data: ICommission): ICommission {
    return {
      ...this.key_commission(data.referrer, data.date),
      ...this.gsi1_commissions_key(data.status),
      ...data,
    };
  }

  commission_put_txi(data: ICommission): TxType["Put"] {
    return {
      TableName: this.table,
      Item: this.commission_record(data),
    };
  }

  ltd_inc_txi(
    referrer: string,
    referred: number,
    amount: number
  ): TxType["Update"] {
    return {
      TableName: this.table,
      Key: this.key_ltd(referrer),
      UpdateExpression:
        "SET #amount = if_not_exists(#amount, :zero) + :amount, #referrer = :referrer",
      ExpressionAttributeNames: {
        "#amount": `#${referred}`,
        "#referrer": "referrer",
      },
      ExpressionAttributeValues: {
        ":zero": 0,
        ":amount": amount,
        ":referrer": referrer,
      },
    };
  }
}
