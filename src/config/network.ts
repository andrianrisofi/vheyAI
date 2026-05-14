import { AptosConfig, Network } from '@aptos-labs/ts-sdk';
import type { NetworkInfo } from '@aptos-labs/js-pro';
import type { ShelbyClientConfig } from '@shelby-protocol/sdk/browser';

export const APTOS_NETWORK = Network.TESTNET;
export const APTOS_EXPLORER_NETWORK = 'testnet';

export const aptosNetworkInfo: NetworkInfo = {
  network: APTOS_NETWORK,
};

export const aptosConfig = new AptosConfig({
  network: APTOS_NETWORK,
});

export const shelbyClientConfig: ShelbyClientConfig = {
  network: APTOS_NETWORK,
  apiKey: import.meta.env.VITE_SHELBY_API_KEY,
  aptos: {
    network: APTOS_NETWORK,
  },
};
