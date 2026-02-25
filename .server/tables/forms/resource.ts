import { is_dev } from "../../helpers";

const config: sst.aws.DynamoArgs = {
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
};

const key = "tbl-forms";
export const forms = (stage: TStage): sst.aws.Dynamo => {
  if (is_dev(stage)) {
    return sst.aws.Dynamo.get(
      key,
      "better-giving-default-tblformsTable-bcseworw"
    );
  }
  return new sst.aws.Dynamo(key, config);
};
