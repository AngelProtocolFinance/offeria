import { is_dev } from "../../helpers";
import stream_handler_deps from "./stream-handler.deps.json";

const key = "tbl-banking-apps";
export const banking_applications = (
  stage: TStage,
  links: $util.Input<any[]>
): sst.aws.Dynamo => {
  if (is_dev(stage)) {
    return sst.aws.Dynamo.get(
      key,
      "better-giving-default-tblbankingappsTable-okzvvhek"
    );
  }
  const d = new sst.aws.Dynamo(key, {
    fields: {
      PK: "string",
      gsi1PK: "number",
      gsi1SK: "string",
      gsi2PK: "string",
      gsi2SK: "string",
      gsi3PK: "number",
      gsi3SK: "string",
      gsi4PK: "string",
      gsi4SK: "string",
    },
    primaryIndex: { hashKey: "PK" },
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
      gsi4: {
        hashKey: "gsi4PK",
        rangeKey: "gsi4SK",
      },
    },
    stream: "new-and-old-images",
    deletionProtection: stage === "production",
  });

  d.subscribe(
    `${key}-sh`,
    {
      handler: ".server/tables/banking-applications/stream-handler.index",
      runtime: "nodejs22.x",
      timeout: "1 minute",
      nodejs: { install: stream_handler_deps },
      link: links,
    },
    {
      transform: {
        eventSourceMapping: { batchSize: 1, maximumRetryAttempts: 0 },
      },
    }
  );

  return d;
};
