import type { Environment } from "../types/list";

export interface IApiKeyPayload {
  npoId: number;
  env: Environment;
  timestamp: number;
}

export interface IApiKey extends IApiKeyPayload {
  PK: string;
  SK: string;
  apiKey: string;
}
