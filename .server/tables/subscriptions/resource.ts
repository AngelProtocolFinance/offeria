import { is_dev } from "../../helpers";

const key = "tbl-subs";
export const subscriptions = (
  stage: TStage,
  link: $util.Input<any[]>
): sst.aws.Dynamo => {
  if (is_dev(stage)) {
    return sst.aws.Dynamo.get(
      key,
      "better-giving-default-tblsubsTable-nzzktocc"
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
    deletionProtection: stage === "production",
  });

  d.subscribe(
    `${key}-sh`,
    {
      handler: ".server/tables/subscriptions/stream-handler.index",
      runtime: "nodejs22.x",
      timeout: "30 seconds",
      link,
    },
    { transform: { eventSourceMapping: { maximumRetryAttempts: 0 } } }
  );
  return d;
};
