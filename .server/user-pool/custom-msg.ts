import {
  cognito_forgot_password,
  cognito_resend_code,
  cognito_signup,
} from "@better-giving/react-emails";
import { render } from "@react-email/components";
import type { CustomMessageTriggerHandler } from "aws-lambda";

export const handler: CustomMessageTriggerHandler = async (event) => {
  const { triggerSource, request, response } = event;
  const {
    codeParameter: code,
    userAttributes: { given_name },
  } = request;

  console.info(`Processing custom message for trigger: ${triggerSource}`);

  switch (triggerSource) {
    case "CustomMessage_SignUp": {
      const { node } = cognito_signup.template({
        first_name: given_name,
        code,
      });
      const html = await render(node);
      response.emailSubject = "Verify your Offeria account";
      response.emailMessage = html;
      break;
    }

    case "CustomMessage_ForgotPassword": {
      const { node } = cognito_forgot_password.template({
        first_name: given_name,
        code,
      });
      const html = await render(node);
      response.emailSubject = "Verify your Offeria account";
      response.emailMessage = html;
      break;
    }

    case "CustomMessage_ResendCode": {
      const { node } = cognito_resend_code.template({
        first_name: given_name,
        code,
      });
      const html = await render(node);
      response.emailSubject = "Verify your Offeria account";
      response.emailMessage = html;
      break;
    }

    default:
      console.info(`Unhandled trigger source: ${triggerSource}`);
  }

  return event;
};
