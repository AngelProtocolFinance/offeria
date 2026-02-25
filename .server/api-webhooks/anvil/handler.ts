import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { nvs } from "../../env";
import { resp } from "../resp";
import { etch_complete } from "./etch-complete";
import type { WebhookPayload } from "./types";

/** don't return 4xx status, to prevent retries */
export const index: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const p: WebhookPayload = JSON.parse(event.body ?? "{}");
    if (p.token !== nvs.anvil.webhook_token) {
      return resp.status(200, "invalid token");
    }

    const base_url = `https://${event.requestContext.domainName}`;

    if (p.action === "etchPacketComplete") {
      const signed = await etch_complete(p.data, base_url);
      return resp.txt(signed || "no doc url");
    }

    return resp.status(200, "no action taken");
  } catch (err) {
    console.error(err);
    return resp.status(206, "error");
  }
};
