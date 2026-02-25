import type { APIGatewayProxyResultV2 } from "aws-lambda";

class Resp {
  json(x: object, status = 200): APIGatewayProxyResultV2 {
    return {
      statusCode: status,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(x),
    };
  }
  status(status: number, text?: string): APIGatewayProxyResultV2 {
    text && console.info(`[resp] ${status} - ${text}`);
    return { statusCode: status, body: text };
  }
  txt(x: string, status = 200): APIGatewayProxyResultV2 {
    return {
      statusCode: status,
      headers: { "content-type": "text/plain" },
      body: x,
    };
  }
  err(status: number, x: string): APIGatewayProxyResultV2 {
    return this.txt(x, status);
  }
}

export const resp = new Resp();
