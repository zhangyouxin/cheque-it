import { Config, predefined } from '@ckb-lumos/config-manager';

export interface NetworkConfig {
  id: string;
  displayName: string;
  networkName: string;
  rpcUrl: string;
  enable?: boolean;
}

export type NetworkId = 'testnet' | 'mainnet';

export const DEFAULT_NETWORK_CONFIG: Record<NetworkId, Config> = {
  testnet: {
    PREFIX: 'ckt',
    SCRIPTS: {
      SECP256K1_BLAKE160: predefined.AGGRON4.SCRIPTS.SECP256K1_BLAKE160,
      SUDT: predefined.AGGRON4.SCRIPTS.SUDT,
      // https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0039-cheque/0039-cheque.md#aggron--pudge-testnet
      CHEQUE: {
        CODE_HASH: '0x60d5f39efce409c587cb9ea359cefdead650ca128f0bd9cb3855348f98c70d5b',
        HASH_TYPE: 'type',
        TX_HASH: '0x7f96858be0a9d584b4a9ea190e0420835156a6010a5fde15ffcdc9d9c721ccab',
        INDEX: '0x0',
        DEP_TYPE: 'depGroup',
      },
    },
  },
  mainnet: {
    PREFIX: 'ckb',
    SCRIPTS: {
      SECP256K1_BLAKE160: predefined.LINA.SCRIPTS.SECP256K1_BLAKE160,
      SUDT: predefined.LINA.SCRIPTS.SUDT,
      // https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0039-cheque/0039-cheque.md#lina--mirana-mainnet
      CHEQUE: {
        CODE_HASH: '0xe4d4ecc6e5f9a059bf2f7a82cca292083aebc0c421566a52484fe2ec51a9fb0c',
        HASH_TYPE: 'type',
        TX_HASH: '0x04632cc459459cf5c9d384b43dee3e36f542a464bdd4127be7d6618ac6f8d268',
        INDEX: '0x0',
        DEP_TYPE: 'depGroup',
      },
    },
  },
};

export const DEFAULT_NETWORKS: Record<NetworkId, NetworkConfig> = {
  testnet: {
    id: 'testnet',
    networkName: 'ckb_testnet',
    displayName: 'Testnet',
    rpcUrl: 'https://testnet.ckb.dev',
    enable: true,
  },
  mainnet: {
    id: 'mainnet',
    networkName: 'ckb',
    displayName: 'Mainnet',
    rpcUrl: 'https://mainnet.ckb.dev',
  },
};
