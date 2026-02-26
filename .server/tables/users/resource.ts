import { is_dev } from "../../helpers";
import stream_handler_deps from "./stream-handler.deps.json";

const key = "tbl-users";
export const users = (
  stage: TStage,
  link: $util.Input<any[]>
): sst.aws.Dynamo => {
  if (is_dev(stage)) {
    return sst.aws.Dynamo.get(key, "offeria-production-tblusersTable-hxvdetdb");
  }

  const d = new sst.aws.Dynamo(key, {
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
      "gsi1-v2": {
        hashKey: "gsi1PK",
        rangeKey: "gsi1SK",
      },
    },
    deletionProtection: stage === "production",
    stream: "new-and-old-images",
  });

  d.subscribe(
    `${key}-sh`,
    {
      handler: ".server/tables/users/stream-handler.index",
      runtime: "nodejs22.x",
      nodejs: { install: stream_handler_deps },
      link,
    },
    { transform: { eventSourceMapping: { maximumRetryAttempts: 0 } } }
  );

  return d;
};
