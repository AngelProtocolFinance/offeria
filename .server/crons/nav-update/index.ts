import handler_deps from "./handler.deps.json";

export const nav_update = (link: $util.Input<any[]>) => {
  new sst.aws.Cron("crn-nav-update", {
    schedule: "cron(0 6 * * ? *)", // every day at 6am UTC
    function: {
      handler: ".server/crons/nav-update/handler.index",
      runtime: "nodejs22.x",
      timeout: "5 minutes",
      link,
      nodejs: { install: handler_deps },
    },
  });

  const init_fn = new sst.aws.Function("crn-nav-update-init-fn", {
    handler: ".server/crons/nav-update/handler-init.index",
    runtime: "nodejs22.x",
    link,
  });

  new aws.lambda.Invocation("crn-nav-update-init", {
    functionName: init_fn.name,
    input: JSON.stringify({}),
  });
};
