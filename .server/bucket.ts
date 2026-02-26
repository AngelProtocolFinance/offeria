const key = "bucket";
export const bucket = (stage: TStage): sst.aws.Bucket => {
  // prod is the owner of the bucket
  if (stage === "production") {
    return new sst.aws.Bucket(key, {
      access: "public",
    });
  }
  return sst.aws.Bucket.get(key, "offeria-production-bucketbucket-fwesdaer");
};
