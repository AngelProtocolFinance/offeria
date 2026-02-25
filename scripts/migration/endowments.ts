import { Txs, dbc } from "@/db";
import {
  GetCommand,
  PutCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";

const TYPESENSE_API_KEY = "qyxhlhiY6upwelcRKvNdYJa6ZPNFHQCh";
const TYPESENSE_ENDPOINT = "https://snf5xy3uipzove8hp-1.a1.typesense.net:443";

const SOURCE_TABLE = "endowments_v3";
const TARGET_TABLE = "better-giving-production-tblendowmentsTable-ocndtfbu";

// step 1: collect all claimed production npo ids from typesense
async function fetch_npo_ids(): Promise<number[]> {
  const ids: number[] = [];
  let page = 1;
  const per_page = 250;

  while (true) {
    const params = new URLSearchParams({
      q: "*",
      filter_by: "claimed:true && env:production",
      per_page: String(per_page),
      page: String(page),
      include_fields: "id",
    });

    const res = await fetch(
      `${TYPESENSE_ENDPOINT}/collections/npos/documents/search?${params}`,
      { headers: { "X-TYPESENSE-API-KEY": TYPESENSE_API_KEY } }
    );

    if (!res.ok)
      throw new Error(`typesense error: ${res.status} ${await res.text()}`);

    const data = await res.json();
    const hits: { document: { id: string } }[] = data.hits ?? [];
    if (hits.length === 0) break;

    for (const { document } of hits) {
      // id format: "production-{int_id}" or "staging-{int_id}"
      const int_id = Number(document.id.split("-").pop());
      if (!Number.isNaN(int_id)) ids.push(int_id);
    }

    console.info(
      `  typesense page ${page}: +${hits.length} ids (${ids.length} total)`
    );
    if (hits.length < per_page) break;
    page++;
  }

  return ids;
}

// step 2: get record from source, put into target
async function migrate(ids: number[]) {
  const BATCH_SIZE = 100; // transact write limit
  let migrated = 0;
  let skipped = 0;

  console.info(`migrating ${ids.length} endowments...`);

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const txs = new Txs();

    for (let j = 0; j < batch.length; j++) {
      const id = batch[j];
      console.info(`  fetching ${i + j + 1}/${ids.length}: Endow#${id}`);
      const cmd = new GetCommand({
        TableName: SOURCE_TABLE,
        Key: { PK: `Endow#${id}`, SK: "production" },
      });
      const { Item } = await dbc.send(cmd);
      if (!Item) {
        skipped++;
        continue;
      }
      txs.put({ TableName: TARGET_TABLE, Item });
    }

    if (txs.all.length > 0) {
      await dbc.send(new TransactWriteCommand({ TransactItems: txs.all }));
      migrated += txs.all.length;
    }

    const processed = Math.min(i + BATCH_SIZE, ids.length);
    const pct = Math.round((processed / ids.length) * 100);
    console.info(
      `  [${pct}%] ${processed}/${ids.length} processed | ${migrated} migrated, ${skipped} skipped`
    );
  }

  console.info(`done: ${migrated} migrated, ${skipped} skipped`);
}

const ids = await fetch_npo_ids();
console.info(`found ${ids.length} claimed production npos`);
console.info(`ids: ${JSON.stringify(ids)}`);

const max_id = Math.max(...ids);
console.info(`max id: ${max_id}`);

await migrate(ids);

// step 3: insert count record
await dbc.send(
  new PutCommand({
    TableName: TARGET_TABLE,
    Item: { PK: "Count", SK: "production", count: max_id },
  })
);
console.info(`count record inserted: ${max_id}`);
