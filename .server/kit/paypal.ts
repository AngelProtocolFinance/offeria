import { PayPalSDK } from "@better-giving/paypal";
import { nvs } from "../env";

export const paypal = new PayPalSDK({
  client_id: nvs.paypal.client_id,
  client_secret: nvs.paypal.client_secret,
  api_url: nvs.paypal.api_url,
});
