import type { IFundDb, IFundItem } from "@/fundraiser";
import { MAX_EXPIRATION_ISO } from "@/fundraiser/schema";
import { rd2num } from "@/helpers/decimal";
import { send_email } from "@/helpers/email";
import { to_payload } from "@/helpers/stream";
import { fund_opt_out_notif } from "@better-giving/react-emails";
import type { DynamoDBStreamHandler } from "aws-lambda";
import { funds_collection } from "../../kit/mongodb";
import { ses } from "../../kit/ses";
import { npodb } from "../endowments";

export const index: DynamoDBStreamHandler = async (event) => {
  for (const record of event.Records) {
    const payload = to_payload<IFundDb>(record);
    if (!payload) continue;

    if (payload.type === "delete") {
      const res = await funds_collection.deleteOne({ id: payload.data.id });
      console.info("deleted:", payload.data.id, res.deletedCount);
      continue;
    }

    // insert or modify
    const r = payload.type === "insert" ? payload.data : payload.curr;

    if (payload.type === "modify") {
      const old = payload.prev;
      // member opted out
      if (r.members.length < old.members.length) {
        let left_npo = 0;
        for (const id of old.members) {
          if (!r.members.includes(id)) left_npo = id;
        }
        if (left_npo !== 0) {
          const npo = await npodb.npo(left_npo, ["name"]);
          if (npo) {
            const { node, subject } = fund_opt_out_notif.template({
              to_name: r.creator_name,
              opted_out_name: npo.name,
            });
            const res = await send_email(ses, {
              node,
              subject,
              to: [r.creator_id],
            });
            console.info("sent opt-out email:", res);
          }
        }
      }
    }

    const exp_ms = r.expiration
      ? new Date(r.expiration).getTime()
      : new Date(MAX_EXPIRATION_ISO).getTime();

    const item: IFundItem = {
      id: r.id,
      name: r.name,
      description: r.description,
      env: r.env,
      logo: r.logo,
      banner: r.banner,
      featured: r.featured,
      active: r.active,
      verified: r.verified,
      donation_total_usd: rd2num(r.donation_total_usd, 0),
      expiration: Math.floor(exp_ms / 1000),
      members: r.members,
      target: r.target,
      creator_id: r.creator_id,
      creator_name: r.creator_name,
    };

    const res = await funds_collection.updateOne(
      { id: r.id },
      { $set: item },
      { upsert: true }
    );
    console.info("upserted:", r.id, res.upsertedCount, res.modifiedCount);
  }
};
