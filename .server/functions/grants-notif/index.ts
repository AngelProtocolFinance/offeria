import handler_deps from "./handler.deps.json";

export const grants_notif = (link: $util.Input<any[]>) =>
  new sst.aws.Function("fn-grants-notif", {
    handler: ".server/functions/grants-notif/handler.index",
    runtime: "nodejs22.x",
    timeout: "5 minutes",
    link,
    nodejs: { install: handler_deps },
  });
