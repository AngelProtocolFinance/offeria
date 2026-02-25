export const is_dev = (stage: TStage) =>
  stage !== "production" && stage !== "default";
