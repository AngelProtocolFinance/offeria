import { is_dev } from "../../helpers";

const key = "tbl-balances";
export const balances = (stage: TStage): sst.aws.Dynamo => {
  if (is_dev(stage)) {
    return sst.aws.Dynamo.get(
      key,
      "better-giving-default-tblbalancesTable-bvcnwmko"
    );
  }
  return new sst.aws.Dynamo(key, {
    fields: {
      network: "string",
      id: "number",
      sfPendingContributions: "number",
      movement: "string",
    },
    primaryIndex: { hashKey: "network", rangeKey: "id" },
    globalIndexes: {
      "Network-SFPendingContributions-Index": {
        hashKey: "network",
        rangeKey: "sfPendingContributions",
      },
      "movement-index": {
        hashKey: "movement",
      },
    },
    deletionProtection: stage === "production",
  });
};
