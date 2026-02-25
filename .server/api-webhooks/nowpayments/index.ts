import handler_deps from "./handler.deps.json";

export const whh_nowpayments = (link: $util.Input<any[]>) =>
  new sst.aws.Function("api-wh-rh-nowpayments", {
    handler: ".server/api-webhooks/nowpayments/handler.index",
    timeout: "30 seconds",
    link,
    nodejs: { install: handler_deps },
  });
