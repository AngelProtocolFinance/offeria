interface IReturn {
  shared: sst.Secret;
  per_stage: sst.Secret;
  client: $util.Output<Record<string, string>>;
  google: $util.Output<IEnv["google"]>;
}

export const secrets = (): IReturn => {
  // loaded via sst secret load --fallback (env-shared)
  const shared = new sst.Secret("SECRETS_SHARED");
  // loaded via sst secret load --fallback (env-default) and --stage production (env-production)
  const per_stage = new sst.Secret("SECRETS");

  const client = $util.all([shared.value, per_stage.value]).apply(([s, p]) => {
    const sv = JSON.parse(s) as IEnvShared;
    const pv = JSON.parse(p) as IEnv;
    return { ...sv.client, ...pv.client } as Record<string, string>;
  });

  const google = per_stage.value.apply((x) => (JSON.parse(x) as IEnv).google);

  return { shared, per_stage, client, google };
};
