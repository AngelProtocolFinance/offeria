import { Wise } from "@/wise";
import { nvs } from "../env";

export const wise = new Wise({
  apiToken: nvs.wise.api_token,
  sandbox: nvs.app.env === "staging",
});
