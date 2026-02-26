import { is_dev } from "../../helpers";
import stream_handler_deps from "./stream-handler.deps.json";

const key = "tbl-funds";
export const funds = (
  stage: TStage,
  link: $util.Input<any[]>
): sst.aws.Dynamo => {
  if (is_dev(stage)) {
    return sst.aws.Dynamo.get(key, "offeria-production-tblfundsTable-mkuvbrfe");
  }
  const d = new sst.aws.Dynamo(key, {
    fields: {
      PK: "string",
      SK: "string",
      gsi1PK: "string",
      gsi1SK: "string",
      slug: "string",
      env: "string",
    },
    primaryIndex: { hashKey: "PK", rangeKey: "SK" },
    globalIndexes: {
      gsi1: {
        hashKey: "gsi1PK",
        rangeKey: "gsi1SK",
      },
      "slug-env-gsi": {
        hashKey: "slug",
        rangeKey: "env",
      },
    },
    stream: "new-and-old-images",
  });

  d.subscribe(
    `${key}-sh`,
    {
      handler: ".server/tables/funds/stream-handler.index",
      runtime: "nodejs22.x",
      link,
      nodejs: { install: stream_handler_deps },
    },
    { transform: { eventSourceMapping: { maximumRetryAttempts: 0 } } }
  );
  return d;
};
