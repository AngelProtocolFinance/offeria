import { SQSClient } from "@aws-sdk/client-sqs";

export const sqs = new SQSClient({});
export const q = {
  don_settled: "TODO: enable when needed",
  don_success: "TODO: enable when needed",
};
