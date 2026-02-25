import { MetricsDb } from "@/metrics";
import { Resource } from "sst";
import { nvs } from "../../env";

export const metricsdb = new MetricsDb(
  Resource["tbl-metrics"].name,
  nvs.app.env
);
