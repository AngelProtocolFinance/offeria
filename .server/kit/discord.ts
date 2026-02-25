import { Discord } from "@/discord";
import { nvs_shared } from "../env";

export const aws_monitor = new Discord(
  nvs_shared.discord.webbhook_url.aws_monitor
);
export const fiat_monitor = new Discord(
  nvs_shared.discord.webbhook_url.fiat_monitor
);

export const bg_sales = new Discord(nvs_shared.discord.webbhook_url.bg_sales);
