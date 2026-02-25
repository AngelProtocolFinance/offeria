import { domain } from "@/constants";

const key = "email";
export const email = (stage: TStage): sst.aws.Email => {
  // default is the owner of the email service
  if (stage === "default") {
    return new sst.aws.Email(key, {
      sender: domain,
      dns: false,
    });
  }
  return sst.aws.Email.get(key, domain);
};
