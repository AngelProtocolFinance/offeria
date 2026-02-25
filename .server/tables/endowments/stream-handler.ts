import type { TRecord } from "@/db";
import type { INpo, INpoItem } from "@/endowment";
import { to_payload } from "@/helpers/stream";
import type { DynamoDBStreamHandler } from "aws-lambda";
import { npos_collection } from "../../kit/mongodb";

const doc_id = (i: INpo) => `${i.env}-${i.id}`;
const is_endow = (r: TRecord): r is INpo => typeof r.id === "number";

export const index: DynamoDBStreamHandler = async (event) => {
  for (const record of event.Records) {
    const payload = to_payload<TRecord>(record);
    if (!payload) continue;
    if (payload.type === "delete") {
      if (!is_endow(payload.data)) continue;
      const did = doc_id(payload.data);
      const res = await npos_collection.deleteOne({ doc_id: did });
      console.info("deleted:", did, res.deletedCount);
      continue;
    }

    // insert or modify
    const r = payload.type === "insert" ? payload.data : payload.curr;
    if (!is_endow(r)) continue;

    // get prev for contributions data
    const prev = await npos_collection.findOne({ doc_id: doc_id(r) });

    const item: INpoItem = {
      active_in_countries: r.active_in_countries,
      card_img: r.card_img,
      claimed: r.claimed,
      env: r.env,
      endow_designation: r.endow_designation,
      hq_country: r.hq_country,
      id: r.id,
      doc_id: doc_id(r),
      kyc_donors_only: r.kyc_donors_only,
      name: r.name,
      published: r.published ?? true,
      registration_number: r.registration_number,
      sdgs: r.sdgs,
      tagline: r.tagline,
      contributions_count: prev?.contributions_count ?? 0,
      contributions_total: prev?.contributions_total ?? 0,
      fund_opt_in: r.fund_opt_in ?? true,
      target: r.target ?? "0",
    };

    const res = await npos_collection.updateOne(
      { doc_id: doc_id(r) },
      { $set: item },
      { upsert: true }
    );
    console.info("upserted:", doc_id(r), res.upsertedCount, res.modifiedCount);
  }
};
