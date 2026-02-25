export type Environment = "staging" | "production";

export type S3Bucket =
  | "bg-funds"
  | "bg-user"
  | "endow-profiles"
  | "endow-reg"
  | "sf-reports-internal"
  | "staging-sf-reports-internal";

/** Donation Chain IDs */
export namespace ChainID {
  type V2OtherChainID =
    | "btc-mainnet"
    | "btc-testnet"
    | "doge-mainnet"
    | "doge-testnet"
    | "sol-mainnet"
    | "sol-testnet"
    | "xrp-mainnet"
    | "xrp-testnet";

  type V2CosmosChainID =
    | "juno-1" //juno
    | "uni-6" //juno testnet
    | "osmosis-1" // osmosis
    | "osmo-test-5" // osmosis testnet
    | "stargaze-1" // stargaze
    | "elgafar-1" // stargaze testnet
    | "kaiyo-1" // kujira
    | "harpoon-4" // kujira testnet
    | "phoenix-1" //terra
    | "pisco-1"; //terra testnet

  type V2EVMChainID =
    | "137" //polygon
    | "1" //ethereum
    | "42161" //arbitrum
    | "10" // optimism
    | "8453" // base
    | "56" //binance smart chain
    | "80002" //amoy
    | "11155111" //sepolia
    | "421614" //arbitrum sepolia
    | "11155420" // optimism sepolia
    | "84532" // base sepolia
    | "97"; //binance testnet

  export type CryptoTestnetChainID =
    | "btc-testnet"
    | "doge-testnet"
    | "pisco-1"
    | "elgafar-1"
    | "harpoon-4"
    | "osmo-test-5"
    | "sol-testnet"
    | "uni-6"
    | "xrp-testnet"
    | "11155111"
    | "421614"
    | "11155420"
    | "84532"
    | "80002"
    | "97";

  export type V2CryptoChainID = V2OtherChainID | V2CosmosChainID | V2EVMChainID;
  export type V2FiatChainID = "fiat";

  export type V2SupportedChainID = V2CryptoChainID | V2FiatChainID;

  type V2CryptoDestinationChainID = "137" | "80002";
  export type V2DestinationChainID = V2FiatChainID | V2CryptoDestinationChainID;
}
