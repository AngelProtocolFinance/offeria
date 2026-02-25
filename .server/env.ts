import { Resource } from "sst";

export const nvs: IEnv = JSON.parse(Resource.SECRETS.value);
const { crypto, ...env_shared }: IEnvShared = JSON.parse(
  Resource.SECRETS_SHARED.value
);

export const nvs_shared = {
  ...env_shared,
  deposit_addr_envs: (chain: string) => {
    switch (chain.toUpperCase()) {
      case "ETH":
        return crypto.deposit_addr.evm;
      case "BNB":
        return crypto.deposit_addr.evm;
      case "HBAR":
        return crypto.deposit_addr.hbar;
      case "REEF":
        return crypto.deposit_addr.reef;
      default:
        return "chain not supported";
    }
  },
};
