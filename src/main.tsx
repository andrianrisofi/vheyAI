import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react'
import { ShelbyClientProvider } from '@shelby-protocol/react'
import { ShelbyClient } from '@shelby-protocol/sdk/browser'
import AptosCoreProvider from './providers/AptosCoreProvider.tsx'
import { APTOS_NETWORK, shelbyClientConfig } from './config/network.ts'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 2,
    },
  },
})

const shelbyClient = new ShelbyClient(shelbyClientConfig)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AptosWalletAdapterProvider
        autoConnect={true}
        dappConfig={{ network: APTOS_NETWORK }}
      >
        <AptosCoreProvider>
          <ShelbyClientProvider client={shelbyClient}>
            <App />
          </ShelbyClientProvider>
        </AptosCoreProvider>
      </AptosWalletAdapterProvider>
    </QueryClientProvider>
  </StrictMode>,
)
