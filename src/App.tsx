import * as React from 'react';
import { Home } from './pages/Home';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 1. import `ChakraProvider` component
import { ChakraProvider } from '@chakra-ui/react';
import { theme } from './theme';


// https://github.com/ckb-js/nexus/blob/main/docs/rpc.md
type MethodNames =
  | 'wallet_enable'
  | 'wallet_fullOwnership_getLiveCells'
  | 'wallet_fullOwnership_getOffChainLocks'
  | 'wallet_fullOwnership_getOnChainLocks'
  | 'wallet_fullOwnership_signData'
  | 'wallet_fullOwnership_signTransaction';
declare global {
  interface Window {
    ckb: {
      request: (payload: { method: MethodNames; params: any }) => Promise<any>;
    };
  }
}

// Create a client
const queryClient = new QueryClient();

export function App() {
  // 2. Wrap ChakraProvider at the root of your app
  return (
    <ChakraProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <Home />
      </QueryClientProvider>
    </ChakraProvider>
  );
}
