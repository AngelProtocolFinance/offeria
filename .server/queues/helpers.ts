import type { IDonation } from "@/donations";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { q, sqs } from "./index";

export const to_q_don_settled = async (don: IDonation): Promise<string> => {
  const { MessageId = "" } = await sqs.send(
    new SendMessageCommand({
      QueueUrl: q.don_settled,
      MessageBody: JSON.stringify(don),
      MessageDeduplicationId: don.id,
      MessageGroupId: don.id,
    })
  );
  console.info("to_q_don_settled", MessageId);
  return MessageId;
};

export const to_q_don_success = async (don: IDonation): Promise<string> => {
  const { MessageId = "" } = await sqs.send(
    new SendMessageCommand({
      QueueUrl: q.don_success,
      MessageBody: JSON.stringify(don),
      MessageDeduplicationId: don.id,
      MessageGroupId: don.id,
    })
  );
  console.info("to_q_don_success", MessageId);
  return MessageId;
};
