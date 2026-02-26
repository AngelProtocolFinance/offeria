import { is_dev } from "../../helpers";

const key = "tbl-webhooks";
export const webhooks = (stage: TStage): sst.aws.Dynamo => {
  if (is_dev(stage)) {
    return sst.aws.Dynamo.get(
      key,
      "offeria-production-tblwebhooksTable-onmsfehm"
    );
  }
  return new sst.aws.Dynamo(key, {
    fields: {
      PK: "string",
      SK: "string",
    },
    primaryIndex: { hashKey: "PK", rangeKey: "SK" },
    deletionProtection: stage === "production",
  });
};
