import { domain } from "@/constants";
import { bucket as bucket_fn } from "./bucket";
import { email as email_fn } from "./email";
// import * as fns from "./functions";
import { secrets as secrets_fn } from "./secrets";
import * as table_fns from "./tables";
import { user_pool as user_pool_fn } from "./user-pool";

// cloudflare managed domains
const domains: Record<string, string> = {
  default: `staging.${domain}`,
  production: domain,
};

export default function (s: TStage): Record<string, any> {
  const links: $util.Input<any[]> = [];

  const scrts = secrets_fn();
  links.push(scrts.per_stage);
  links.push(scrts.shared);

  const eml = email_fn(s);
  links.push(eml);

  const table_users = table_fns.users(s, links);
  const user_pool = user_pool_fn({
    stage: s,
    google: scrts.google,
    links: [...links, table_users],
  });
  links.push(user_pool);

  const table_metrics = table_fns.metrics(s);

  const table_endowments = table_fns.endowments(s, [...links]);
  const table_funds = table_fns.funds(s, [...links, table_endowments, eml]);
  const table_webhooks = table_fns.webhooks(s);

  const tables = {
    api_keys: table_fns.api_keys(s),
    bal_txs: table_fns.bal_txs(s, [...links, table_endowments]),
    balances: table_fns.balances(s),
    banking_applications: table_fns.banking_applications(s, [
      ...links,
      table_users,
    ]),
    commissions: table_fns.commissions(s),
    donation_messages: table_fns.donation_messages(s),
    donations_settled: table_fns.donations_settled(s, [
      ...links,
      table_metrics,
      table_users,
      table_endowments,
      table_webhooks,
    ]),
    donations: table_fns.donations(s),
    endowments: table_endowments,
    forms: table_fns.forms(s),
    funds: table_funds,
    liquid: table_fns.liquid(s),
    metrics: table_metrics,
    nav_history: table_fns.nav_history(s),
    payouts_v2: table_fns.payouts_v2(s),
    registrations: table_fns.registrations(s, links),
    subscriptions: table_fns.subscriptions(s, links),
    summary: table_fns.summary(s),
    table: table_fns.table(s),
    users_meta: table_fns.users_meta(s),
    users: table_users,
    webhooks: table_webhooks,
  };

  links.push(...Object.values(tables));

  const bckt = bucket_fn(s);
  links.push(bckt);

  const d = domains[s];
  new sst.aws.React("website", {
    dev: { command: "pnpm dev" },
    buildCommand: "pnpm build",
    link: links,
    environment: scrts.client,
    domain: d && { name: d, dns: sst.cloudflare.dns() },
  });

  const tables_outputs = Object.fromEntries(
    Object.entries(tables).map(([key, table]) => [`table_${key}`, table.name])
  );

  return {
    ...tables_outputs,
    bucket: bckt.name,
    email_sender: eml.sender,
    secret: scrts.per_stage.name,
    secret_shared: scrts.shared.name,
    user_pool: user_pool.id,
  };
}
