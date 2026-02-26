import { domain } from "@/constants";
import { is_dev } from "./helpers";

const key = "email";
export const email = (s: TStage) => {
  if (is_dev(s)) {
    return sst.aws.Email.get(key, domain);
  }
  return new sst.aws.Email(key, {
    sender: domain,
    dns: sst.cloudflare.dns(),
  });
};
