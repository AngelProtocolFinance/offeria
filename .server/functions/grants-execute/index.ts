import handler_deps from "./handler.deps.json";

export const grants_execute = (link: $util.Input<any[]>) =>
  new sst.aws.Function("fn-grants-execute", {
    handler: ".server/functions/grants-execute/handler.index",
    runtime: "nodejs22.x",
    timeout: "5 minutes",
    link,
    nodejs: { install: handler_deps },
  });
