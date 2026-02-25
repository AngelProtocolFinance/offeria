import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Db, Txs, dbc } from "@/db";

const __dirname = dirname(fileURLToPath(import.meta.url));
import { ScanCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

const pairs: [to: string, from: string][] = [
  ["better-giving-production-tbldonssettledTable-vbdddkcx", "Donations"],
  ["better-giving-production-tblapikeysTable-kwombkbr", "api-keys"],
  ["better-giving-production-tblliquidTable-thxketkz", "liquid"],
  ["better-giving-production-tblusersTable-vzrxezcr", "UsersV2"],
  ["better-giving-production-tblsummaryTable-kdwrfrvs", "summary"],
  ["better-giving-production-tblwebhooksTable-onuobrkv", "webhooks"],
  ["better-giving-production-tblsubsTable-bdzmwswd", "subs"],
  ["better-giving-production-tbldonmsgsTable-enzwvncz", "donation_messages"],
  ["better-giving-production-tblmetricsTable-bdkxwdme", "metrics"],
  ["better-giving-production-tblmainTable-rrwmwxed", "table"],
  ["better-giving-production-tblcommissionsTable-ndvafacu", "commissions"],
  ["better-giving-production-tblusersmetaTable-mozaxenv", "users-meta"],
  ["better-giving-production-tbldonsTable-dcxfwevu", "donations"],
  ["better-giving-production-tblpayoutsv2Table-shtrcsaw", "payouts-v2"],
  ["better-giving-production-tblbalancesTable-mxrrmwdv", "balances"],
  ["better-giving-production-tblregistrationsTable-szefudhr", "registrations"],
  ["better-giving-production-tblnavhistoryTable-rnvvdctu", "nav-history"],
  [
    "better-giving-production-tblbankingappsTable-srrhtrzr",
    "banking-applications",
  ],
  ["better-giving-production-tblbaltxsTable-dtmrmzsw", "bal-txs"],
  ["better-giving-production-tblformsTable-hkscfmou", "forms"],
  ["better-giving-production-tblfundsTable-nhuxmhzb", "funds"],
];

const from_arg = process.argv
  .find((a) => a.startsWith("--from="))
  ?.split("=")[1];
const filtered = from_arg
  ? pairs.filter(([, from]) => from === from_arg)
  : pairs;

if (from_arg && filtered.length === 0) {
  console.error(`no pair found for --from=${from_arg}`);
  process.exit(1);
}

const report: {
  from: string;
  to: string;
  source_count: number;
  migrated_count: number;
}[] = [];

for (const [to, from] of filtered) {
  const db = new Db(from, "production");

  const items = await db.exhaust(
    ScanCommand,
    { TableName: db.table },
    (x) => x
  );

  const BATCH_SIZE = 100;
  const total = items.length;
  let migrated = 0;
  console.info(`Migrating ${from} → ${to}: ${total} items...`);

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const txs = new Txs();
    for (const item of batch) {
      txs.put({ TableName: to, Item: item });
    }

    const cmd = new TransactWriteCommand({ TransactItems: txs.all });
    await dbc.send(cmd);

    migrated += batch.length;
    console.info(
      `  Progress: ${migrated}/${total} (${Math.round((migrated / total) * 100)}%)`
    );
  }

  report.push({ from, to, source_count: total, migrated_count: migrated });
  console.info(`Done: ${from} → ${to}`);
}

writeFileSync(join(__dirname, "result.json"), JSON.stringify(report, null, 2));
console.info("Report saved to ./result.json");
