import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
const sfn = new SFNClient({});
export const index = async () => {
  const arn = process.env.SFN_ARN;
  if (!arn) throw new Error("Missing SFN_ARN");
  const cmd = new StartExecutionCommand({
    stateMachineArn: arn,
  });
  await sfn.send(cmd);
};
