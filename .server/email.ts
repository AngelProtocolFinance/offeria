import { domain } from "@/constants";

const key = "email";
export const email = () => {
  return new sst.aws.Email(key, {
    sender: domain,
    dns: sst.cloudflare.dns(),
  });
};
