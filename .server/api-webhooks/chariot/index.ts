import handler_deps from "./handler.deps.json";

export const whh_chariot = (link: $util.Input<any[]>) =>
  new sst.aws.Function("api-wh-rh-chariot", {
    handler: ".server/api-webhooks/chariot/handler.index",
    timeout: "30 seconds",
    link,
    nodejs: { install: handler_deps },
  });
