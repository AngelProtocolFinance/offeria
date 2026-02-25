import type { IBalance } from "@/balance";
import { dbc } from "@/db";
import type { IBalLog } from "@/liquid";
import {
  PutCommand,
  ScanCommand,
  type ScanCommandInput,
} from "@aws-sdk/lib-dynamodb";
import type { Handler } from "aws-lambda";
import { nvs } from "../../env";
import { baldb } from "../../tables/balances";
import { liqdb } from "../../tables/liquid";

export const index: Handler = async () => {
  const now = new Date();

  const scan: ScanCommandInput = {
    TableName: baldb.table,
    FilterExpression: "#env = :env",
    ExpressionAttributeNames: {
      "#env": "network",
      "#liq": "liq",
      "#id": "id",
    },
    ExpressionAttributeValues: { ":env": nvs.app.env },
    ProjectionExpression: "#id, #liq",
  };

  type B = Pick<IBalance, "id" | "liq">;
  const bals = await liqdb.exhaust<typeof ScanCommand, B>(
    ScanCommand,
    scan,
    (x) => x as any
  );
  const non_zero_bals = bals.filter((x) => x.liq && x.liq > 0);

  const npo_bals = non_zero_bals.reduce(
    (acc, cur) => {
      acc[cur.id] = cur.liq ?? 0;
      return acc;
    },
    {} as Record<string, number>
  );

  const log: IBalLog = {
    date: now.toISOString(),
    balances: npo_bals,
    total: non_zero_bals.reduce((a, { liq = 0 }) => a + liq, 0),
  };
  const put = new PutCommand({
    TableName: liqdb.table,
    Item: liqdb.bal_log_record(log),
  });

  await dbc.send(put);
  console.info(`Logged ${non_zero_bals.length} non-zero balances`);
  return { statusCode: 200 };
};
