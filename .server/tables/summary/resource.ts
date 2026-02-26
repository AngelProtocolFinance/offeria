import { is_dev } from "../../helpers";

const config: sst.aws.DynamoArgs = {
  fields: {
    type: "string",
  },
  primaryIndex: { hashKey: "type" },
};

const key = "tbl-summary";
export const summary = (stage: TStage): sst.aws.Dynamo => {
  if (is_dev(stage)) {
    return sst.aws.Dynamo.get(
      key,
      "offeria-production-tblsummaryTable-nnznemzr"
    );
  }
  return new sst.aws.Dynamo(key, config);
};
