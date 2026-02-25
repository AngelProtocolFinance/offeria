import { DonationsDb } from "@/donation";
import { Resource } from "sst";
import { nvs } from "../../env";

export const dondb = new DonationsDb(
  Resource["tbl-dons-settled"].name,
  nvs.app.env
);
