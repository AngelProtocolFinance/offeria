import type { SQSHandler } from "aws-lambda";
import { aws_monitor } from "../kit/discord";

export const index: SQSHandler = async (event, ctx) => {
  for (const record of event.Records) {
    const body = JSON.parse(record.body);

    await aws_monitor.send_alert({
      from: ctx.functionName,
      title: "failed to process donation",
      body: [
        `**message id:** ${record.messageId}`,
        `**donation id:** ${body.id ?? "unknown"}`,
        `**receive count:** ${record.attributes?.ApproximateReceiveCount ?? "unknown"}`,
        `**first receive:** ${record.attributes?.ApproximateFirstReceiveTimestamp ?? "unknown"}`,
        "```json",
        JSON.stringify(body, null, 2).slice(0, 1500),
        "```",
      ].join("\n"),
    });

    console.error("DLQ message:", {
      messageId: record.messageId,
      body,
      attributes: record.attributes,
    });
  }
};
