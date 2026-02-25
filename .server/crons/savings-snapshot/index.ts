import handler_deps from "./handler.deps.json";

export const savings_snapshot = (link: $util.Input<any[]>) => {
  new sst.aws.Cron("crn-savings-snapshot", {
    schedule: "cron(0 0 * * ? *)", // every day at midnight UTC
    function: {
      handler: ".server/crons/savings-snapshot/handler.index",
      runtime: "nodejs22.x",
      timeout: "5 minutes",
      link,
      nodejs: { install: handler_deps },
    },
  });
};
