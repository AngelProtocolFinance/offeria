import { ReferralsDb } from "@/referrals";
import { Resource } from "sst";
import { nvs } from "../../env";

export const referralsdb = new ReferralsDb(
  Resource["tbl-commissions"].name,
  nvs.app.env
);
