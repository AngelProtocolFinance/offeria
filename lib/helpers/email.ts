import { type SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import type { IAmount } from "@better-giving/react-emails";
import { render } from "@react-email/components";
import type { ReactElement } from "react";
import { rd2num, rd_vdec, usdpu } from "./decimal/utils";

interface IInput {
  node: ReactElement;
  to: string[];
  bcc?: string[];
  subject: string;
}

export async function send_email(client: SESv2Client, i: IInput) {
  const cmd = new SendEmailCommand({
    FromEmailAddress: "Better Giving 😇 <hi@better.giving>",
    Destination: { ToAddresses: i.to, BccAddresses: i.bcc },
    Content: {
      Simple: {
        Subject: { Data: i.subject, Charset: "UTF-8" },
        Body: {
          Html: {
            Data: render(i.node),
            Charset: "UTF-8",
          },
        },
      },
    },
  });
  return client.send(cmd);
}

export const to_amount = (
  amount: number,
  amount_usd: number,
  denom: string
): IAmount => {
  return {
    value: +rd_vdec(amount, usdpu(amount, amount_usd)),
    currency: denom,
    value_usd: rd2num(amount_usd),
  };
};
