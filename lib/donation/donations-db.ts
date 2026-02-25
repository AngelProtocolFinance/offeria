import {
  GetCommand,
  QueryCommand,
  type QueryCommandInput,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Db, type TxType, UpdateBuilder, dbc } from "../db";
import type { IPageKeyed } from "../types/api";
import type {
  IDonationFinal,
  IDonationFinalAttr,
  IDonationFinalUpdate,
} from "./interfaces";
import type { IDonationsSearch, IPageOpts } from "./schema";

type K = keyof IDonationFinalAttr;

export class DonationsDb extends Db {
  static readonly gsi_referrer$settled_date = "Referrer-FinalizedDate_Index";
  static readonly gsi_npo$settled_date = "npo-settled_date-gsi";
  static readonly gsi_email$tx_date = "email-tx_date-gsi";

  key(id: string) {
    return { transactionId: id } satisfies Pick<
      IDonationFinalAttr,
      "transactionId"
    >;
  }

  async item(id: string): Promise<IDonationFinal | undefined> {
    const cmd = new GetCommand({
      TableName: this.table,
      Key: this.key(id),
    });
    return dbc.send(cmd).then((r) => r.Item as any);
  }

  put_txi(data: IDonationFinalAttr): TxType["Put"] {
    return {
      TableName: this.table,
      Item: data,
      ConditionExpression: `attribute_not_exists(${"transactionId" satisfies keyof IDonationFinalAttr})`,
    };
  }

  async update(
    id: string,
    data: IDonationFinalUpdate
  ): Promise<IDonationFinal> {
    const upd8 = new UpdateBuilder();
    for (const k in data) {
      upd8.set(k, (data as any)[k]);
    }
    const cmd = new UpdateCommand({
      TableName: this.table,
      Key: this.key(id),
      ReturnValues: "ALL_NEW",
      ConditionExpression: `attribute_exists(${"transactionId" satisfies K})`,
      ...upd8.collect(),
    });
    return dbc.send(cmd).then((r) => r.Attributes as any);
  }

  update_txi(id: string, data: IDonationFinalUpdate): TxType["Update"] {
    const upd8 = new UpdateBuilder();
    for (const k in data) {
      upd8.set(k as K, (data as any)[k]);
    }
    return {
      TableName: this.table,
      Key: this.key(id),
      ConditionExpression: `attribute_exists(${"transactionId" satisfies K})`,
      ...upd8.collect(),
    };
  }

  referred_by_q(referrer: string, opts?: IPageOpts) {
    const q: QueryCommandInput = {
      TableName: this.table,
      IndexName: DonationsDb.gsi_referrer$settled_date,
      KeyConditionExpression: "#referrer = :referrer",
      ExpressionAttributeNames: {
        "#referrer": "referrer" satisfies K,
      },
      ExpressionAttributeValues: {
        ":referrer": referrer,
      },
      Limit: opts?.limit,
      ExclusiveStartKey: this.key_to_obj(opts?.next),
      ScanIndexForward: false,
    };
    return q;
  }

  async referred_by(referrer: string, opts?: IPageOpts) {
    const cmd = new QueryCommand(this.referred_by_q(referrer, opts));
    return dbc.send(cmd).then(this.to_page<IDonationFinal>);
  }

  async list_to_npo(
    npo: number,
    opts?: IDonationsSearch & { date_start?: string; date_end?: string }
  ): Promise<IPageKeyed<IDonationFinal>> {
    /** key condition expression */
    let kce = "#npo = :npo";
    /** expression attribute names */
    const ean: Record<string, string> = {
      "#npo": "endowmentId" satisfies K,
    };
    /** expression attribute values */
    const eav: Record<string, any> = {
      ":npo": npo,
    };

    if (opts?.date_start && opts?.date_end) {
      kce += " AND #settled_date BETWEEN :date_start AND :date_end";
      ean["#settled_date"] = "donationFinalTxDate" satisfies K;
      eav[":date_start"] = opts.date_start;
      eav[":date_end"] = opts.date_end;
    } else if (opts?.date_start) {
      kce += " AND #settled_date >= :date_start";
      ean["#settled_date"] = "donationFinalTxDate" satisfies K;
      eav[":date_start"] = opts.date_start;
    } else if (opts?.date_end) {
      kce += " AND #settled_date <= :date_end";
      ean["#settled_date"] = "donationFinalTxDate" satisfies K;
      eav[":date_end"] = opts.date_end;
    }

    const cmd = new QueryCommand({
      TableName: this.table,
      IndexName: DonationsDb.gsi_npo$settled_date,
      KeyConditionExpression: kce,
      ExpressionAttributeNames: ean,
      ExpressionAttributeValues: eav,
      Limit: opts?.limit,
      ExclusiveStartKey: this.key_to_obj(opts?.next),
      ScanIndexForward: false,
    });
    return dbc.send(cmd).then(this.to_page<IDonationFinal>);
  }

  async list_by_email(
    email: string,
    opts?: IDonationsSearch
  ): Promise<IPageKeyed<IDonationFinal>> {
    /** key condition expression */
    let kce = "#email = :email";
    /** expression attribute names */
    const ean: Record<string, string> = {
      "#email": "email" satisfies K,
    };
    /** expression attribute values */
    const eav: Record<string, any> = {
      ":email": email,
    };

    if (opts?.date_start && opts?.date_end) {
      kce += " AND #settled_date BETWEEN :date_start AND :date_end";
      ean["#settled_date"] = "transactionDate" satisfies K;
      eav[":date_start"] = opts.date_start;
      eav[":date_end"] = opts.date_end;
    } else if (opts?.date_start) {
      kce += " AND #settled_date >= :date_start";
      ean["#settled_date"] = "transactionDate" satisfies K;
      eav[":date_start"] = opts.date_start;
    } else if (opts?.date_end) {
      kce += " AND #settled_date <= :date_end";
      ean["#settled_date"] = "transactionDate" satisfies K;
      eav[":date_end"] = opts.date_end;
    }

    const cmd = new QueryCommand({
      TableName: this.table,
      IndexName: DonationsDb.gsi_email$tx_date,
      KeyConditionExpression: kce,
      ExpressionAttributeNames: ean,
      ExpressionAttributeValues: eav,
      Limit: opts?.limit,
      ExclusiveStartKey: this.key_to_obj(opts?.next),
      ScanIndexForward: false,
    });

    return dbc.send(cmd).then(this.to_page<IDonationFinal>);
  }
}
