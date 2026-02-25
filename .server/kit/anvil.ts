import Anvil from "@anvilco/anvil";
import { nvs } from "../env";

export const anvil = new Anvil({
  apiKey: nvs.anvil.api_key,
});
