import type { Environment } from "../types/list";

export interface IWebhook {
  PK: string;
  SK: string;
  id: string;
  npoId: number;
  env: Environment;
  url: string;
}
