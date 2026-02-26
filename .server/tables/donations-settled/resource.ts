import { is_dev } from "../../helpers";
import stream_handler_deps from "./stream-handler/index.deps.json";

const key = "tbl-dons-settled";
export const donations_settled = (
  stage: TStage,
  link: $util.Input<any[]>
): sst.aws.Dynamo => {
  if (is_dev(stage)) {
    return sst.aws.Dynamo.get(
      key,
      "offeria-production-tbldonssettledTable-ouuhuhwb"
    );
  }
  const d = new sst.aws.Dynamo(key, {
    fields: {
      transactionId: "string",
      // email-tx_date-gsi
      email: "string",
      transactionDate: "string",

      // npo-settled_date-gsi
      endowmentId: "number",
      donationFinalTxDate: "string",

      //referrer-FinalizedDate_Index
      referrer: "string",
    },
    primaryIndex: { hashKey: "transactionId" },
    globalIndexes: {
      "email-tx_date-gsi": {
        hashKey: "email",
        rangeKey: "transactionDate",
      },
      "npo-settled_date-gsi": {
        hashKey: "endowmentId",
        rangeKey: "donationFinalTxDate",
      },
      "Referrer-FinalizedDate_Index": {
        hashKey: "referrer",
        rangeKey: "donationFinalTxDate",
      },
    },
    stream: "new-and-old-images",
    deletionProtection: stage === "production",
  });

  d.subscribe(
    `${key}-sh`,
    {
      handler: ".server/tables/donations-settled/stream-handler/index.handler",
      runtime: "nodejs22.x",
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
