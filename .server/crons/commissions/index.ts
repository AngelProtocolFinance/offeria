import handler_deps from "./handler.deps.json";

export const commissions = (link: $util.Input<any[]>) => {
  new sst.aws.Cron("crn-commissions", {
    schedule: "cron(0 0 1 * ? *)", // run at 00:00 on the 1st day of every month
    function: {
      handler: ".server/crons/commissions/handler.index",
      runtime: "nodejs22.x",
      timeout: "5 minutes",
      link,
      nodejs: { install: handler_deps },
    },
  });
};
