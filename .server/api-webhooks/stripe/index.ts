import handler_deps from "./handler.deps.json";

export const whh_stripe = (link: $util.Input<any[]>) =>
  new sst.aws.Function("api-wh-rh-stripe", {
    handler: ".server/api-webhooks/stripe/handler.index",
    timeout: "30 seconds",
    link,
    nodejs: { install: handler_deps },
  });
