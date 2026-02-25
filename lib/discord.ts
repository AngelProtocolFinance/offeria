// https://birdie0.github.io/discord-webhooks-guide/discord_webhook.html

interface Field {
  name: string;
  value: string;
  inline?: true;
}

export interface Alert {
  /** ends up in embed.author */
  from: string;
  /** ends up in content section, up to 2000 characters */
  title: string;
  /** ends up in embed.description */
  body?: string;

  /** additional structured content */
  fields?: Field[];
  /*
   * ERROR: accent is red; title is prepended i.e ERROR:{title}
   * @default "NOTICE"
   */
  type?: "ERROR" | "NOTICE";
}

const RED = 13041721;
const BLUE = 2856675;

const headers = {
  "content-type": "application/json",
};

export class Discord {
  private webhookUrl: string;
  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async send_alert({ type = "NOTICE", ...alert }: Alert) {
    const color = type === "NOTICE" ? BLUE : RED;

    const embed = {
      author: { name: alert.from },
      description: alert.body,
      fields: alert.fields,
      color,
    };
    const payload = {
      content: type === "NOTICE" ? alert.title : `ERROR:${alert.title}`,
      embeds: [embed],
    };

    return await global.fetch(this.webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  }
}
