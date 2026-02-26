import { is_dev } from "../../helpers";

const key = "tbl-commissions";
export const commissions = (stage: TStage): sst.aws.Dynamo => {
  if (is_dev(stage)) {
    return sst.aws.Dynamo.get(
      key,
      "offeria-production-tblcommissionsTable-rbsnxfsn"
    );
  }
  return new sst.aws.Dynamo(key, {
    fields: {
      PK: "string",
      SK: "string",
      gsi1PK: "string",
      gsi1SK: "string",
    },
    primaryIndex: { hashKey: "PK", rangeKey: "SK" },
    globalIndexes: {
      gsi1: {
        hashKey: "gsi1PK",
        rangeKey: "gsi1SK",
      },
    },
    deletionProtection: stage === "production",
  });
};
