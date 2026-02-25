import { is_dev } from "../../helpers";

const key = "tbl-dons";
export const donations = (stage: TStage): sst.aws.Dynamo => {
  if (is_dev(stage)) {
    return sst.aws.Dynamo.get(
      key,
      "better-giving-default-tbldonsTable-rnvsnbtv"
    );
  }
  return new sst.aws.Dynamo(key, {
    fields: {
      PK: "string",
      SK: "string",
      gsi1PK: "string",
      gsi1SK: "string",
      gsi2PK: "string",
      gsi2SK: "string",
      env: "string",
    },
    primaryIndex: { hashKey: "PK", rangeKey: "SK" },
    globalIndexes: {
      gsi1: {
        hashKey: "gsi1PK",
        rangeKey: "gsi1SK",
      },
      "env-sk": {
        hashKey: "env",
        rangeKey: "SK",
      },
      gsi2: {
        hashKey: "gsi2PK",
        rangeKey: "gsi2SK",
      },
    },
    deletionProtection: stage === "production",
  });
};
