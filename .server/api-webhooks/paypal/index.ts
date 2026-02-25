import handler_deps from "./handler.deps.json";

export const whh_paypal = (link: $util.Input<any[]>) =>
  new sst.aws.Function("api-wh-rh-paypal", {
    handler: ".server/api-webhooks/paypal/handler.index",
    timeout: "30 seconds",
    link,
    nodejs: { install: handler_deps },
  });
