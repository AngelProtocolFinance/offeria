import { GRANTS_CRON_AWS, GRANTS_EXEC_DELAY_DAYS } from "./schedule";
import deps from "./starter.deps.json";
export const grants = (
  notif_fn: sst.aws.Function,
  exec_fn: sst.aws.Function
) => {
  const definition = sst.aws.StepFunctions.lambdaInvoke({
    name: "grants-notif",
    function: notif_fn,
  })
    .next(
      sst.aws.StepFunctions.wait({
        name: "Wait1Day",
        time: `${GRANTS_EXEC_DELAY_DAYS} day`,
      })
    )
    .next(
      sst.aws.StepFunctions.lambdaInvoke({
        name: "grants-execute",
        function: exec_fn,
      })
    );

  const state_machine = new sst.aws.StepFunctions("sfn-grants", {
    definition,
  });

  const sfn_link = new sst.Linkable("lnk-sfn-grants", {
    properties: { arn: state_machine.arn },
    include: [
      sst.aws.permission({
        actions: ["states:StartExecution"],
        resources: [state_machine.arn],
      }),
    ],
  });

  new sst.aws.Cron("crn-payouts", {
    schedule: GRANTS_CRON_AWS,
    function: {
      handler: ".server/crons/grants/starter.index",
      runtime: "nodejs22.x",
      nodejs: { install: deps },
      link: [sfn_link],
      environment: { SFN_ARN: state_machine.arn },
    },
  });
};
