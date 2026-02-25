import { SQSClient } from "@aws-sdk/client-sqs";
import { Resource } from "sst";

export const sqs = new SQSClient({});
export const q = {
  don_settled: Resource["q-don-settlement"].url,
  don_success: Resource["q-don-success"].url,
};
