import { createAnthropic } from "@ai-sdk/anthropic";
import { nvs_shared } from "../env";

export const antropic = createAnthropic({
  apiKey: nvs_shared.antropic.api_key,
});
