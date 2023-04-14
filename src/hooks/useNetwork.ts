import { useEffect } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { DEFAULT_NETWORKS, DEFAULT_NETWORK_CONFIG, NetworkId } from '../commons/networks';

export const useNetwork = () => {
  const [networkId, setNetworkId] = useLocalStorage<NetworkId | undefined>('cheque-it-network', 'testnet');

  useEffect(() => {
    if (!networkId) {
      setNetworkId('testnet');
    }
  });

  const blockchainConfig = DEFAULT_NETWORK_CONFIG[networkId || 'testnet'];
  const networkConfig = DEFAULT_NETWORKS[networkId || 'testnet'];

  return { networkId, setNetworkId, blockchainConfig, networkConfig };
};
