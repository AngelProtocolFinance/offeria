import { is_dev } from "../../helpers";
import handler_deps from "./handler.deps.json";

const key = "q-don-settlement";

export const donation_settlement = (
  stage: TStage,
  link: $util.Input<any[]>
) => {
  if (is_dev(stage)) {
    return sst.aws.Queue.get(
      key,
      "https://sqs.us-east-1.amazonaws.com/571372027840/better-giving-default-qdonsettlementQueue-ohtessoe.fifo"
    );
  }

  const dlq = new sst.aws.Queue("q-don-settlement-dlq", {
    fifo: true,
    visibilityTimeout: "5 minutes",
  });

  dlq.subscribe({
    handler: ".server/queues/dlq-handler.index",
    runtime: "nodejs22.x",
    link,
    timeout: "5 minutes",
  });

  const q = new sst.aws.Queue(key, {
    fifo: true,
    visibilityTimeout: "6 minutes",
    dlq: { queue: dlq.arn, retry: 1 },
  });

  q.subscribe(
    {
      handler: ".server/queues/donation-settlement/handler.index",
      runtime: "nodejs22.x",
      link,
      timeout: "5 minutes",
      nodejs: { install: handler_deps },
    },
    { batch: { size: 1 } }
  );
  return q;
};
