import { is_dev } from "../../helpers";

const config: sst.aws.DynamoArgs = {
  fields: {
    PK: "string",
    SK: "string",
    gsi1PK: "string",
    gsi1SK: "string",
    gsi2PK: "string",
    gsi2SK: "string",
  },
  primaryIndex: { hashKey: "PK", rangeKey: "SK" },
  globalIndexes: {
    gsi1: {
      hashKey: "gsi1PK",
      rangeKey: "gsi1SK",
    },
    gsi2: {
      hashKey: "gsi2PK",
      rangeKey: "gsi2SK",
    },
  },
};

const key = "tbl-payouts-v2";
export const payouts_v2 = (stage: TStage): sst.aws.Dynamo => {
  if (is_dev(stage)) {
    return sst.aws.Dynamo.get(
      key,
      "better-giving-default-tblpayoutsv2Table-ramskoxm"
    );
  }
  return new sst.aws.Dynamo(key, config);
};
