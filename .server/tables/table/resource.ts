import { is_dev } from "../../helpers";

const config: sst.aws.DynamoArgs = {
  fields: {
    PK: "string",
    SK: "string",
    gsi1PK: "string",
    gsi1SK: "string",
    gsi2PK: "string",
    gsi2SK: "string",
    gsi3PK: "string",
    gsi3SK: "string",
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
    gsi3: {
      hashKey: "gsi3PK",
      rangeKey: "gsi3SK",
    },
  },
};

const key = "tbl-main";
export const table = (stage: TStage): sst.aws.Dynamo => {
  if (is_dev(stage)) {
    return sst.aws.Dynamo.get(key, "offeria-production-tblmainTable-oskfxkfs");
  }
  return new sst.aws.Dynamo(key, config);
};
