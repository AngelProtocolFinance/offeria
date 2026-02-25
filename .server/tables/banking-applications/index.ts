import { BankingApplicationsDb } from "@/banking-applications";
import { Resource } from "sst";
import { nvs } from "../../env";

export const bappdb = new BankingApplicationsDb(
  Resource["tbl-banking-apps"].name,
  nvs.app.env
);
