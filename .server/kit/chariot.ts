import { Chariot } from "@better-giving/chariot";
import { nvs } from "../env";

export const chariot = new Chariot(nvs.chariot);
