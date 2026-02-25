import { SESv2Client } from "@aws-sdk/client-sesv2";
export {
  SendEmailCommand,
  type SendEmailCommandInput,
} from "@aws-sdk/client-sesv2";

export const ses = new SESv2Client({});
