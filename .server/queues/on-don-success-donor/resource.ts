import { is_dev } from "../../helpers";
import handler_deps from "./handler.deps.json";

const key = "q-don-success";

export const donation_success = (stage: TStage, link: $util.Input<any[]>) => {
  if (is_dev(stage)) {
    return sst.aws.Queue.get(
      key,
      "https://sqs.us-east-1.amazonaws.com/186466507516/offeria-production-qdonsuccessQueue-owhuhtwk.fifo"
    );
  }

  const dlq = new sst.aws.Queue("q-don-success-dlq", {
    fifo: true,
    visibilityTimeout: "5 minutes",
  });
  dlq.subscribe({
    handler: ".server/queues/dlq-handler.index",
    runtime: "nodejs22.x",
    link,
    timeout: "1 minute",
  });

  const q = new sst.aws.Queue(key, {
    fifo: true,
    visibilityTimeout: "1 minute",
    dlq: { queue: dlq.arn, retry: 1 },
  });
  q.subscribe({
    handler: ".server/queues/on-don-success-donor/handler.index",
    runtime: "nodejs22.x",
    timeout: "1 minute",
    link,
    nodejs: { install: handler_deps },
  });

  return q;
};
