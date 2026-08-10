import { AptosConfig, Network } from '@aptos-labs/ts-sdk';
import type { NetworkInfo } from '@aptos-labs/js-pro';
import type { ShelbyClientConfig } from '@shelby-protocol/sdk/browser';

export const APTOS_NETWORK = Network.SHELBYNET;
export const APTOS_EXPLORER_NETWORK = 'shelbynet';
export const SHELBY_EXPLORER_NETWORK = 'shelbynet';
export const SHELBY_LOCATION_HINT = 'shelbynet-1';

export const aptosNetworkInfo: NetworkInfo = {
  network: APTOS_NETWORK,
};

export const aptosConfig = new AptosConfig({
  network: APTOS_NETWORK,
});

export const shelbyClientConfig: ShelbyClientConfig = {
  network: APTOS_NETWORK,
  apiKey: import.meta.env.VITE_SHELBY_API_KEY,
  rpc: {
    baseUrl: 'https://shelby.shelbynet.shelby.xyz/shelby',
    apiKey: import.meta.env.VITE_SHELBY_API_KEY,
  },
  indexer: {
    apiKey: import.meta.env.VITE_SHELBY_API_KEY,
  },
  locationHint: SHELBY_LOCATION_HINT,
};
