import {
  BatchGetCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Db, type TxType, Txs, UpdateBuilder, dbc } from "../db";
import type { IInvite, INpoAdmin, IUserBookmark, IUserNpo } from "./interfaces";
import type {
  IInviteNew,
  IUser,
  IUserDb,
  IUserXFund,
  IUserXNpo,
  IUserXNpoUpdate,
} from "./schema";

export class UserDb extends Db {
  static readonly gs1 = "gsi1-v2";
  key_user(id: string) {
    return {
      PK: `Email#${id}`,
      SK: `Email#${id}`,
    };
  }
  key_user_bookmark(id: number, user: string) {
    return {
      PK: `Email#${user}`,
      SK: `BM#${this.env}#${id}`,
    };
  }
  key_invite(id: string) {
    return {
      PK: `Invite#${id}`,
      SK: `Invite#${id}`,
    };
  }

  key_userxnpo(npo: number, user: string) {
    return {
      PK: `Email#${user}`,
      SK: `Endow#${this.env}#${npo}`,
    };
  }

  key_userxfund(fund: string, user: string) {
    return {
      PK: `Email#${user}`,
      SK: `Fund#${this.env}#${fund}`,
    };
  }
  gsi1_fund_admin(fund: string, user: string) {
    return {
      gsi1PK: `Fund#${fund}`,
      gsi1SK: `Email#${this.env}#${user}`,
    };
  }
  gs1_npo_admin(npo: number, user: string) {
    return {
      gsi1PK: `Endow#${npo}`,
      gsi1SK: `Email#${this.env}#${user}`,
    };
  }

  invite_record(data: IInviteNew) {
    return {
      ...this.key_invite(data.invitee),
      ...data,
      expireAt: new Date().getTime() + 5 * 60 * 1000, // five minutes from now
      env: this.env,
    } satisfies IInvite;
  }

  user_update(id: string, update: Partial<IUserDb>) {
    const upd8 = new UpdateBuilder();
    for (const [k, v] of Object.entries(update)) {
      upd8.set(k, v);
    }
    const cmd = new UpdateCommand({
      TableName: this.table,
      Key: this.key_user(id),
      ...upd8.collect(),
    });
    return dbc.send(cmd);
  }

  userxfund_record(fund: string, user: string) {
    return {
      ...this.key_userxfund(fund, user),
      ...this.gsi1_fund_admin(fund, user),
      fundId: fund,
      email: user,
    } satisfies IUserXFund;
  }
  userxfund_put_txi(fund: string, user: string): TxType["Put"] {
    return {
      TableName: this.table,
      Item: this.userxfund_record(fund, user),
    };
  }
  userxfund_del_txi(fund: string, user: string): TxType["Delete"] {
    return {
      TableName: this.table,
      Key: this.key_userxfund(fund, user),
    };
  }

  userxnpo_record(npo: number, user: string) {
    return {
      ...this.key_userxnpo(npo, user),
      ...this.gs1_npo_admin(npo, user),
      email: user,
      endowID: npo,
    } satisfies IUserXNpo;
  }
  userxnpo_put_txi(npo: number, user: string): TxType["Put"] {
    return {
      TableName: this.table,
      Item: this.userxnpo_record(npo, user),
    };
  }
  userxnpo_put(npo: number, user: string) {
    const cmd = new PutCommand({
      TableName: this.table,
      Item: this.userxnpo_record(npo, user),
    });
    return dbc.send(cmd);
  }
  userxnpo_del_txi(npo: number, user: string): TxType["Delete"] {
    return {
      TableName: this.table,
      Key: this.key_userxnpo(npo, user),
    };
  }

  async user(id: string): Promise<IUser | undefined> {
    const cmd = new GetCommand({
      TableName: this.table,
      Key: this.key_user(id),
    });
    const { Item: i } = await dbc.send(cmd);
    return i && this.sans_keys(i);
  }

  async npo_admins(npo: number): Promise<INpoAdmin[]> {
    const q = new QueryCommand({
      TableName: this.table,
      IndexName: UserDb.gs1,
      KeyConditionExpression: "gsi1PK = :pk and begins_with(gsi1SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": this.gs1_npo_admin(npo, "not-used").gsi1PK,
        ":sk": `Email#${this.env}#`,
      },
      ProjectionExpression: "email",
    });

    const items = await dbc
      .send(q)
      .then(this.to_items<Pick<IUserXNpo, "email">>);

    if (items.length === 0) return [];

    //get user detail for each admin
    const bget = new BatchGetCommand({
      RequestItems: {
        [this.table]: {
          Keys: items.map((i) => this.key_user(i.email)),
          ProjectionExpression: "PK, familyName, givenName",
        },
      },
    });

    type U = Pick<IUser, "familyName" | "givenName"> & { PK: string };

    const { Responses } = await dbc.send(bget);
    const users = (Responses?.[this.table] ?? []) as U[];
    const usersMap = users.reduce(
      (acc, { PK, ...curr }) => {
        acc[PK] = curr;
        return acc;
      },
      {} as { [index: string]: Omit<U, "PK"> }
    );

    return items.map((i) => {
      const x = usersMap[`Email#${i.email}`];
      return {
        email: i.email,
        familyName: x?.familyName ?? "",
        givenName: x?.givenName ?? "",
      };
    });
  }

  async npo_admin_tx(npo: number, invite: IInviteNew) {
    const txs = new Txs();
    txs.put({
      TableName: this.table,
      Item: this.userxnpo_record(npo, invite.invitee),
    });

    txs.put({
      TableName: this.table,
      Item: this.invite_record(invite),
    });

    const cmd = new TransactWriteCommand({
      TransactItems: txs.all,
    });
    await dbc.send(cmd);
  }

  async userxnpo_del(npo: number, user: string) {
    const cmd = new DeleteCommand({
      TableName: this.table,
      Key: this.key_userxnpo(npo, user),
    });
    return dbc.send(cmd);
  }

  userxnpo_update_txi(
    npo: number,
    user: string,
    update: IUserXNpoUpdate
  ): TxType["Update"] {
    return {
      TableName: this.table,
      Key: this.key_userxnpo(npo, user),
      UpdateExpression: "SET alertPref = :ap",
      ExpressionAttributeValues: {
        ":ap": update.alertPref,
      },
    };
  }

  async user_npos(user: string): Promise<IUserNpo[]> {
    const cmd = new QueryCommand({
      TableName: this.table,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skSubstr)",
      ExpressionAttributeValues: {
        ":pk": this.key_userxnpo(0, user).PK,
        ":skSubstr": `Endow#${this.env}#`,
      },
    });
    const creds = await dbc.send(cmd).then(this.to_items<IUserXNpo>);
    return creds.map((x) => ({
      id: x.endowID,
      alert_pref: x.alertPref,
    }));
  }

  async user_funds(user: string): Promise<string[]> {
    const cmd = new QueryCommand({
      TableName: this.table,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skSubstr)",
      ExpressionAttributeValues: {
        ":pk": this.key_userxfund("", user).PK,
        ":skSubstr": `Fund#${this.env}#`,
      },
    });
    const creds = await dbc.send(cmd).then(this.to_items<IUserXFund>);
    return creds.map((x) => x.fundId);
  }

  async user_bookmarks(user: string): Promise<IUserBookmark[]> {
    const command = new QueryCommand({
      TableName: this.table,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skSubstr)",
      ExpressionAttributeValues: {
        ":pk": this.key_user_bookmark(0, user).PK,
        ":skSubstr": `BM#${this.env}#`,
      },
    });
    return dbc.send(command).then(this.to_items<IUserBookmark>);
  }

  async user_bookmark_del(user: string, bookmark: number) {
    const cmd = new DeleteCommand({
      TableName: this.table,
      Key: this.key_user_bookmark(bookmark, user),
    });
    return dbc.send(cmd);
  }

  async user_bookmark_put(user: string, npo: number) {
    const item: IUserBookmark = {
      ...this.key_user_bookmark(npo, user),
      endowID: npo,
      email: user,
    };
    const cmd = new PutCommand({
      TableName: this.table,
      Item: item,
    });
    await dbc.send(cmd);
    return { id: npo };
  }
}
