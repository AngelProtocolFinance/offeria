export const whh_alchemy = (link: $util.Input<any[]>) =>
  new sst.aws.Function("api-wh-rh-alchemy", {
    handler: ".server/api-webhooks/alchemy/handler.index",
    timeout: "30 seconds",
    link,
  });
