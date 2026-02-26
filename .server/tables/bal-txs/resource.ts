import { is_dev } from "../../helpers";
import stream_handler_deps from "./stream-handler.deps.json";

const key = "tbl-bal-txs";
export const bal_txs = (
  stage: TStage,
  link: $util.Input<any[]>
): sst.aws.Dynamo => {
  if (is_dev(stage)) {
    return sst.aws.Dynamo.get(
      key,
      "offeria-production-tblbaltxsTable-kntfhrnv"
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
    stream: "new-and-old-images",
    deletionProtection: stage === "production",
  });

  d.subscribe(
    `${key}-sh`,
    {
      handler: ".server/tables/bal-txs/stream-handler.index",
      runtime: "nodejs22.x",
      timeout: "30 seconds",
      link,
      nodejs: { install: stream_handler_deps },
    },
    { transform: { eventSourceMapping: { maximumRetryAttempts: 0 } } }
  );

  return d;
};
