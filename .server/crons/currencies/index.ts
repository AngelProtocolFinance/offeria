export const currencies = (link: $util.Input<any[]>) => {
  new sst.aws.Cron("crn-currencies", {
    schedule: "cron(0 */6 * * ? *)", // every 6 hours
    function: {
      handler: ".server/crons/currencies/handler.index",
      runtime: "nodejs22.x",
      timeout: "5 minutes",
      link,
    },
  });
};
