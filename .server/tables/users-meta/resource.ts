import { is_dev } from "../../helpers";

const config: sst.aws.DynamoArgs = {
  fields: {
    PK: "string",
    SK: "string",
  },
  primaryIndex: { hashKey: "PK", rangeKey: "SK" },
};

const key = "tbl-users-meta";
export const users_meta = (stage: TStage): sst.aws.Dynamo => {
  if (is_dev(stage)) {
    return sst.aws.Dynamo.get(
      key,
      "better-giving-default-tblusersmetaTable-rxmhxnxc"
    );
  }
  return new sst.aws.Dynamo(key, config);
};
