import { is_dev } from "../../helpers";
import stream_handler_deps from "./stream/handler.deps.json";

const key = "tbl-registrations";
export const registrations = (
  stage: TStage,
  link: $util.Input<any[]>
): sst.aws.Dynamo => {
  if (is_dev(stage)) {
    return sst.aws.Dynamo.get(
      key,
      "offeria-production-tblregistrationsTable-efaeabvh"
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
    stream: "new-and-old-images",
  });

  d.subscribe(
    `${key}-sh`,
    {
      handler: ".server/tables/registrations/stream/handler.index",
      runtime: "nodejs22.x",
      timeout: "1 minute",
      link,
      nodejs: { install: stream_handler_deps },
    },
    {
      transform: {
        eventSourceMapping: { batchSize: 1, maximumRetryAttempts: 0 },
      },
    }
  );
  return d;
};
