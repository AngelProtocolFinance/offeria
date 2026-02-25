import { is_dev } from "../../helpers";
import stream_handler_deps from "./stream-handler.deps.json";

const key = "tbl-endowments";
export const endowments = (
  stage: TStage,
  link: $util.Input<any>[]
): sst.aws.Dynamo => {
  if (is_dev(stage)) {
    return sst.aws.Dynamo.get(
      key,
      "better-giving-default-tblendowmentsTable-zhtrhtkv"
    );
  }
  const d = new sst.aws.Dynamo(key, {
    fields: {
      PK: "string",
      SK: "string",
      gsi1PK: "string",
      gsi1SK: "string",
      gsi2PK: "string",
      gsi2SK: "string",
      slug: "string",
      env: "string",
      registration_number: "string",
      keyword: "string",
    },
    primaryIndex: { hashKey: "PK", rangeKey: "SK" },
    globalIndexes: {
      "env-gsi": {
        hashKey: "env",
      },
      gsi1: {
        hashKey: "gsi1PK",
        rangeKey: "gsi1SK",
      },
      gsi2: {
        hashKey: "gsi2PK",
        rangeKey: "gsi2SK",
      },
      "keyword-env-gsi": {
        hashKey: "keyword",
        rangeKey: "env",
      },
      "regnum-env-gsi": {
        hashKey: "registration_number",
        rangeKey: "env",
      },
      "slug-env-gsi": {
        hashKey: "slug",
        rangeKey: "env",
      },
    },
    stream: "new-and-old-images",
    deletionProtection: stage === "production",
  });

  d.subscribe(
    `${key}-sh`,
    {
      handler: ".server/tables/endowments/stream-handler.index",
      runtime: "nodejs22.x",
      link,
      nodejs: { install: stream_handler_deps },
    },
    { transform: { eventSourceMapping: { maximumRetryAttempts: 0 } } }
  );
  return d;
};
