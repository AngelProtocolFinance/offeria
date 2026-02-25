import { DonationDonorsDb } from "@/donation";
import { Resource } from "sst";
import { nvs } from "../../env";

export const donordb = new DonationDonorsDb(
  Resource["tbl-don-msgs"].name,
  nvs.app.env
);
