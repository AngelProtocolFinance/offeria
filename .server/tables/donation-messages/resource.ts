import { is_dev } from "../../helpers";

const key = "tbl-don-msgs";
export const donation_messages = (stage: TStage): sst.aws.Dynamo => {
  if (is_dev(stage)) {
    return sst.aws.Dynamo.get(
      key,
      "better-giving-default-tbldonmsgsTable-uhauwtun"
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
      "recipient-env-gsi": {
        hashKey: "gsi1PK",
        rangeKey: "gsi1SK",
      },
    },
  });
};
