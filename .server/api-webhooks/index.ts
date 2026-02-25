import { domain } from "@/constants";

export const api_wh_domain = (s: TStage) =>
  `webhooks${s === "production" ? "" : "-test"}.${domain}`;
export const base_url = (s: TStage) => `https://${api_wh_domain(s)}`;
