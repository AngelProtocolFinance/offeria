import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { Db, type TxType, dbc } from "../db";
import type { ISODate } from "../types/alias";
import type { IPageKeyed } from "../types/api";
import type { IPublicDonor } from "./interfaces";
import type { IPageOpts } from "./schema";

export type DMKey = `DM#${string}`;

export class DonationDonorsDb extends Db {
  static readonly gsi1 = "gsi1";

  key(id: string) {
    return { PK: `DM#${id}`, SK: `DM#${id}` } as const;
  }
  gsi1_by_recipient(recipient: string, date: string) {
    return {
      gsi1PK: `Recipient#${recipient}#${this.env}`,
      gsi1SK: date as ISODate,
    } as const;
  }

  record(data: IPublicDonor) {
    return {
      ...this.key(data.id),
      ...this.gsi1_by_recipient(data.recipient_id, data.date),
      ...data,
    };
  }

  put_txi(data: IPublicDonor): TxType["Put"] {
    return {
      TableName: this.table,
      Item: this.record(data),
    };
  }

  list(recipient: string, opts?: IPageOpts): Promise<IPageKeyed<IPublicDonor>> {
    const cmd = new QueryCommand({
      TableName: this.table,
      IndexName: DonationDonorsDb.gsi1,
      KeyConditionExpression: "gsi1PK = :gsi1PK",
      ExpressionAttributeValues: {
        ":gsi1PK": this.gsi1_by_recipient(recipient, "only-sk-is-used").gsi1PK,
      },
      Limit: opts?.limit,
      ExclusiveStartKey: this.key_to_obj(opts?.next),
      ScanIndexForward: false,
    });
    return dbc.send(cmd).then(this.to_page<IPublicDonor>);
  }
}
