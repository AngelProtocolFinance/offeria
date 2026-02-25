import { Nowpayments } from "@/nowpayments";
import { nvs } from "../env";

export const np = new Nowpayments({
  apiToken: nvs.nowpayments.api_key,
  baseUrl: nvs.nowpayments.api_url,
});
