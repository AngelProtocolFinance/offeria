import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  type QueryCommandOutput,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Db, type TRecord, type TxType, dbc } from "../db";
import { to_bapp, to_pn } from "./helpers";
import type {
  IBapp,
  IBappsOpts,
  IBappsPage,
  IPriorityNums,
} from "./interfaces";
import {
  type IApplication,
  type IUpdate,
  type TStatus,
  priority_nums,
} from "./schema";

export class BankingApplicationsDb extends Db {
  /**
   * increments number which result is lexicographically greater than the input number
   * e.g. 8,9,91,92,93
   * where we skip `10` as `10` is lexicographically less than `9`
   * */
  lex_increase(num: number) {
    return num % 10 === 9 ? num * 10 + 1 : num + 1;
  }

  top_bapp(records: TRecord[]): IBapp | undefined {
    const r = records[0];
    if (!r) return undefined;
    const num = to_pn(r.gsi4SK);
    if (num > priority_nums.approved) return to_bapp(r);
    return undefined;
  }

  key_application(id: string) {
    return { PK: id };
  }

  gsi1_npo_bapps(id: number, status: TStatus, date: string) {
    return {
      gsi1PK: id,
      gsi1SK: `${this.env}#${status}#${date}`,
    };
  }
  /** bapps dashboard */
  gsi2_bapps(status: TStatus, date: string) {
    return {
      gsi2PK: this.env,
      gsi2SK: `${status}#${date}`,
    };
  }

  /** @deprecated */
  gsi3_npo_bapps_by_pn(id: number, pn: number, date: string) {
    return {
      gsi3PK: id,
      gsi3SK: `${pn}#${date}`,
    };
  }
  gsi4_npo_bapps_by_pn(id: number, pn: number, date: string) {
    return {
      gsi4PK: `${id}#${this.env}`,
      gsi4SK: `${pn}#${date}`,
    };
  }

  async bapp(id: string, pns?: IPriorityNums): Promise<IBapp | undefined> {
    const cmd = new GetCommand({
      TableName: this.table,
      Key: this.key_application(id),
      ConsistentRead: true,
    });
    return dbc.send(cmd).then(
      ({ Item: i }) =>
        i &&
        to_bapp(i, {
          top: pns?.top,
          heir: pns?.heir,
        })
    );
  }

  bapp_record(
    data: IApplication,
    status: TStatus | "default" = "under-review"
  ) {
    const d8_created = new Date().toISOString();
    const s = status === "default" ? "approved" : status;
    const pns = {
      "under-review": priority_nums.pending,
      approved: priority_nums.approved,
      rejected: priority_nums.rejected,
      default: priority_nums.approved + 1,
    } as const;

    return {
      ...this.key_application(data.wiseRecipientID),
      ...this.gsi1_npo_bapps(data.endowmentID, s, d8_created),
      ...this.gsi2_bapps(s, d8_created),
      ...this.gsi4_npo_bapps_by_pn(data.endowmentID, pns[status], d8_created),
      ...data,
    };
  }
  bapp_put(...args: Parameters<typeof this.bapp_record>) {
    const cmd = new PutCommand({
      TableName: this.table,
      Item: this.bapp_record(...args),
    });
    return dbc.send(cmd);
  }

  bapp_put_txi(...args: Parameters<typeof this.bapp_record>): TxType["Put"] {
    return {
      TableName: this.table,
      Item: this.bapp_record(...args),
    };
  }

  async npo_bapp_records(
    id: number,
    opts?: Omit<IBappsOpts, "status">
  ): Promise<QueryCommandOutput> {
    const cmd = new QueryCommand({
      Limit: opts?.limit ?? 15,
      TableName: this.table,
      IndexName: "gsi4",
      KeyConditionExpression: "gsi4PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `${id}#${this.env}`,
      },
      ScanIndexForward: false,
    });
    return await dbc.send(cmd);
  }

  async npo_bapps(id: number, opts?: Omit<IBappsOpts, "status">) {
    const res = await this.npo_bapp_records(id, opts);
    const items = (res.Items || []) as TRecord[];
    const tpn = this.top_bapp(items)?.this_pn;
    const page_items = items.map((item, idx, records) => {
      const heir = records[idx + 1];
      const hpn = heir ? to_bapp(heir).this_pn : undefined;
      return to_bapp(item, { top: tpn, heir: hpn });
    });
    return {
      items: page_items,
      next: this.key_to_base64(res.LastEvaluatedKey),
    };
  }

  async npo_default_bapp(id: number): Promise<IBapp | undefined> {
    return this.npo_bapp_records(id, { limit: 1 }).then(({ Items: x = [] }) =>
      this.top_bapp(x)
    );
  }

  async npo_bapp(id: string, npo_id: number): Promise<IBapp | undefined> {
    const x = await this.npo_bapps(npo_id, { limit: 2 });
    const top = x.items[0];
    const { top_pn: tpn, heir_pn: hpn } = top || {};
    return this.bapp(id, { top: tpn, heir: hpn });
  }

  async bapps(opts?: IBappsOpts): Promise<IBappsPage> {
    const { status = "under-review", next, limit = 15 } = opts || {};
    const cmd = new QueryCommand({
      Limit: limit,
      ExclusiveStartKey: this.key_to_obj(next),
      TableName: this.table,
      IndexName: "gsi2",
      KeyConditionExpression: "gsi2PK = :pk and begins_with(gsi2SK, :sk)",
      ExpressionAttributeValues: { ":pk": this.env, ":sk": `${status}#` },
      ScanIndexForward: false,
    });

    const res = await dbc.send(cmd);
    const page = this.to_page(res, (r) => to_bapp(r));
    return page;
  }

  async bapp_update(prev: IBapp, update: IUpdate) {
    const page = await this.npo_bapps(prev.npo_id, { limit: 1 });
    const top = page.items[0];
    const { top_pn: tpn = 0 } = top || {};
    const { id, date_created: dc } = prev;
    if (update.type === "approved" || update.type === "rejected") {
      const npn = async () => {
        if (update.type === "rejected") return priority_nums.rejected;
        if (tpn > priority_nums.approved) return priority_nums.approved;
        //set as priority if nothing is set already set
        return priority_nums.approved + 1;
      };
      const reason = update.type === "rejected" ? update.reason : "";
      const gsi1 = this.gsi1_npo_bapps(prev.npo_id, update.type, dc);
      const gsi2 = this.gsi2_bapps(update.type, dc);
      const gsi4 = this.gsi4_npo_bapps_by_pn(prev.npo_id, await npn(), dc);
      const command = new UpdateCommand({
        TableName: this.table,
        Key: { PK: id },
        UpdateExpression:
          "SET gsi1SK = :gsi1SK, gsi2SK = :gsi2SK, gsi4SK =:gsi4SK, rejectionReason = :reason",
        ExpressionAttributeValues: {
          ":gsi1SK": gsi1.gsi1SK,
          ":gsi2SK": gsi2.gsi2SK,
          ":gsi4SK": gsi4.gsi4SK,
          ":reason": reason,
        },
      });
      return dbc.send(command);
    }
    /// PRIORITIZE ///
    const pn2 = this.lex_increase(tpn || priority_nums.approved);
    const gsi4 = this.gsi4_npo_bapps_by_pn(prev.npo_id, pn2, dc);
    const cmd = new UpdateCommand({
      TableName: this.table,
      Key: { PK: id },
      UpdateExpression: "SET gsi4SK = :sk",
      ExpressionAttributeValues: {
        ":sk": gsi4.gsi4SK,
      },
      ReturnValues: "ALL_NEW",
    });
    return dbc.send(cmd);
  }

  bapp_delete(id: string) {
    const cmd = new DeleteCommand({
      TableName: this.table,
      Key: { PK: id },
    });
    return dbc.send(cmd);
  }
}
