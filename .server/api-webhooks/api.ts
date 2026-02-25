import { api_wh_domain } from "./index";

interface Handlers {
  stripe: sst.aws.Function;
  paypal: sst.aws.Function;
  alchemy: sst.aws.Function;
  anvil: sst.aws.Function;
  chariot: sst.aws.Function;
  nowpayments: sst.aws.Function;
}

export const webhooks_api = (s: TStage, h: Handlers) => {
  const api = new sst.aws.ApiGatewayV2("api-webhooks", {
    domain: {
      name: api_wh_domain(s),
      dns: sst.cloudflare.dns(),
    },
  });

  api.route("POST /stripe-webhook", h.stripe.arn);
  api.route("POST /paypal-webhook", h.paypal.arn);
  // production only
  api.route("POST /alchemy-webhook/{chain_id}/{signing_key}", h.alchemy.arn);
  api.route("POST /anvil-webhook", h.anvil.arn);
  api.route("POST /chariot-webhook", h.chariot.arn);
  api.route("POST /nowpayments-webhook", h.nowpayments.arn);

  return api;
};
