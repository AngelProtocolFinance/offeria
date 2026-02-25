import { Txs, dbc } from "@/db";
import { UserDb } from "@/user";
import { ScanCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

export const db = new UserDb("UsersV2", "production");

const users = await db.exhaust(ScanCommand, { TableName: db.table }, (x) => x);

const counts = new Map<string, number>();
for (const user of users) {
  const email = user.email?.toLowerCase();
  if (email) counts.set(email, (counts.get(email) ?? 0) + 1);
}

const dupes = [...counts.entries()]
  .filter(([, n]) => n > 1)
  .sort((a, b) => b[1] - a[1]);

console.info(`total users: ${users.length}`);
console.info(`unique emails: ${counts.size}`);
console.info(`duplicates: ${dupes.length}`);
const batch = new Txs();
let deleted = 0;
let flushed = 0;

async function flush() {
  if (batch.all.length === 0) return;
  const count = batch.all.length;
  await dbc.send(new TransactWriteCommand({ TransactItems: batch.all }));
  batch.all.length = 0;
  deleted += count;
  flushed++;
  console.info(
    `  flushed batch #${flushed} (${count} items, ${deleted} total deleted)`
  );
}

for (const [i, [email, n]] of dupes.entries()) {
  const funds = await db.user_funds(email);
  const npos = await db.user_npos(email);
  if (funds.length > 3 && npos.length === 0) {
    for (const fund of funds) {
      batch.del(db.userxfund_del_txi(fund, email));
      if (batch.all.length >= 100) await flush();
    }
  }

  console.info(
    `[${i + 1}/${dupes.length}] ${n}x ${email} | funds: ${funds.length} | npos: ${npos.length}`
  );
}

await flush();
console.info(`done — ${deleted} funds deleted in ${flushed} batches`);
