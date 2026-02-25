const stage = {
  prod: "production",
  default: "default",
};
export default $config({
  app(input) {
    return {
      name: "better-giving",
      removal: "retain",
      protect: input?.stage === stage.prod,
      home: "aws",
      providers: { cloudflare: "6.13.0" },
    };
  },
  async run() {
    const stage = $app.stage as TStage;
    const mod = await import("./.server/run");
    return mod.default(stage);
  },
  console: {
    autodeploy: {
      target(event) {
        if (event.type !== "branch" || event.action !== "pushed") return;

        // try again
        const targets: Record<string, { stage: string } | undefined> = {
          master: { stage: "production" },
          staging: { stage: "default" },
        };

        return targets[event.branch];
      },
    },
  },
});
