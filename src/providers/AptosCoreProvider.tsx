import type { PropsWithChildren } from 'react';
import { AptosJSCoreProvider, useWalletAdapterCore } from '@aptos-labs/react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { aptosNetworkInfo } from '../config/network';

const AptosCoreProvider = ({ children }: PropsWithChildren) => {
  const wallet = useWallet();
  const core = useWalletAdapterCore({
    wallet,
    defaultNetwork: aptosNetworkInfo,
  });

  return <AptosJSCoreProvider core={core}>{children}</AptosJSCoreProvider>;
};

export default AptosCoreProvider;
