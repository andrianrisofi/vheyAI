import { AptosConfig, Network } from '@aptos-labs/ts-sdk';
import type { NetworkInfo } from '@aptos-labs/js-pro';
import type { ShelbyClientConfig } from '@shelby-protocol/sdk/browser';

export const APTOS_NETWORK = Network.SHELBYNET;
export const APTOS_EXPLORER_NETWORK = 'shelbynet';
export const SHELBY_EXPLORER_NETWORK = 'shelbynet';

export const aptosNetworkInfo: NetworkInfo = {
  network: APTOS_NETWORK,
};

export const aptosConfig = new AptosConfig({
  network: APTOS_NETWORK,
});

export const shelbyClientConfig: ShelbyClientConfig = {
  network: APTOS_NETWORK,
  apiKey: import.meta.env.VITE_SHELBY_API_KEY,
  indexer: {
    baseUrl: 'https://api.shelbynet.aptoslabs.com/nocode/v1/public/alias/shelby/shelbynet/v1/graphql',
  },
  rpc: {
    baseUrl: 'https://api.shelbynet.shelby.xyz/shelby',
  },
  aptos: {
    network: APTOS_NETWORK,
    fullnode: 'https://api.shelbynet.shelby.xyz/v1',
    indexer: 'https://api.shelbynet.shelby.xyz/v1/graphql',
  },
};
