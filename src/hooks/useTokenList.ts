import { useEffect } from 'react';
import { DEFAULT_NETWORKS, DEFAULT_NETWORK_CONFIG, NetworkId } from '../commons/networks';
import { useNetwork } from './useNetwork';

type Token = {
  symbol: string;
  name: string;
  decimals: number;
  tokenURI: string;
  lockArgs: string;
};

export const useTokenList = () => {
  const { networkId } = useNetwork();

  let tokenList: Token[] = [];
  switch (networkId) {
  case 'mainnet':
    tokenList = require('../assets/token-lists/mainnet.json');
    break;
  case 'testnet':
    tokenList = require('../assets/token-lists/testnet.json');
    break;
  default:
    tokenList = require('../assets/token-lists/testnet.json');
  }

  console.log('tokenList', tokenList);

  return { tokenList };
};
