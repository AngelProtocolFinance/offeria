import { domain } from "@/constants";
import custom_msg_deps from "./custom-msg.deps.json";
import post_confirm_deps from "./post-confirm.deps.json";

const keys = {
  user_pool: "usrpl",
  identity_provider_google: "Google",
  client: "usrpl-client",
  domain: "usrpl-domain",
  dns: "usrpl-dns",
};

interface IGoogle {
  client_id: string;
  client_secret: string;
}

interface IInput {
  stage: TStage;
  google: $util.Output<IGoogle>;
  links?: $util.Input<any[]>;
}

const stage_config = {
  default: {
    callback_urls: ["http://localhost:4200/", `https://staging.${domain}/`],
    logout_urls: ["http://localhost:4200/", `https://staging.${domain}/`],
    domain: `auth-test.${domain}`,
    dns_name: "auth-test",
    deletion_protection: "INACTIVE",
  },
  production: {
    callback_urls: ["http://localhost:4200/", `https://${domain}/`],
    logout_urls: ["http://localhost:4200/", `https://${domain}/`],
    domain: `auth.${domain}`,
    dns_name: "auth",
    deletion_protection: "INACTIVE",
  },
};

function create_user_pool(i: IInput, config: (typeof stage_config)["default"]) {
  const post_confirm = new sst.aws.Function("usrpl-post-confirm-hndlr", {
    handler: ".server/user-pool/post-confirm.handler",
    runtime: "nodejs22.x",
    link: i.links,
    nodejs: { install: post_confirm_deps },
  });

  const pre_token = new sst.aws.Function("usrpl-pre-token-gen-hndlr", {
    handler: ".server/user-pool/pre-token.handler",
    runtime: "nodejs22.x",
    link: i.links,
  });

  const custom_msg = new sst.aws.Function("usrpl-custom-msg-hndlr", {
    handler: ".server/user-pool/custom-msg.handler",
    runtime: "nodejs22.x",
    nodejs: { install: custom_msg_deps },
  });

  const s = new sst.aws.CognitoUserPool(keys.user_pool, {
    usernames: ["email"],
    triggers: {
      customMessage: custom_msg.arn,
      postConfirmation: post_confirm.arn,
      preTokenGeneration: pre_token.arn,
    },
  });

  const google_provider = s.addIdentityProvider(keys.identity_provider_google, {
    type: "google",
    details: {
      authorize_scopes: "email profile",
      client_id: i.google.apply((g) => g.client_id),
      client_secret: i.google.apply((g) => g.client_secret),
    },
    attributes: {
      email: "email",
      family_name: "family_name",
      given_name: "given_name",
      username: "sub",
    },
  });

  s.addClient(keys.client, {
    providers: [google_provider.providerName],
    callbackUrls: config.callback_urls,
  });

  new aws.cognito.UserGroup("usrpl-admin-group", {
    userPoolId: s.id,
    name: "ap-admin",
  });

  const zone = cloudflare.getZoneOutput({
    filter: { name: domain },
  });

  // acm cert for cognito custom domain
  const cert = new aws.acm.Certificate("usrpl-cert", {
    domainName: config.domain,
    validationMethod: "DNS",
  });

  const cert_dns = new cloudflare.DnsRecord("usrpl-cert-dns", {
    zoneId: zone.zoneId,
    name: cert.domainValidationOptions[0].resourceRecordName,
    type: "CNAME",
    content: cert.domainValidationOptions[0].resourceRecordValue,
    ttl: 300,
    proxied: false,
  });

  const cert_validation = new aws.acm.CertificateValidation(
    "usrpl-cert-validation",
    {
      certificateArn: cert.arn,
      validationRecordFqdns: [cert_dns.name],
    }
  );

  const usrpl_domain = new aws.cognito.UserPoolDomain(keys.domain, {
    domain: config.domain,
    userPoolId: s.id,
    certificateArn: cert_validation.certificateArn,
  });

  new cloudflare.DnsRecord(keys.dns, {
    zoneId: zone.zoneId,
    name: config.dns_name,
    type: "CNAME",
    content: usrpl_domain.cloudfrontDistribution,
    ttl: 300,
    proxied: false,
  });

  return s;
}

export const user_pool = (i: IInput) => {
  if (i.stage === "default") {
    return create_user_pool(i, stage_config.default);
  }

  if (i.stage === "production") {
    return create_user_pool(i, stage_config.production);
  }

  // dev stages reference default pool
  return sst.aws.CognitoUserPool.get(keys.user_pool, "us-east-1_XC8gYbyhd");
};
