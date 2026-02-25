import handler_deps from "./handler.deps.json";

export const whh_anvil = (link: $util.Input<any[]>) =>
  new sst.aws.Function("api-wh-rh-anvil", {
    handler: ".server/api-webhooks/anvil/handler.index",
    timeout: "30 seconds",
    link,
    nodejs: { install: handler_deps },
  });
