import * as config from '@ckb-lumos/config-manager';
import * as helpers from '@ckb-lumos/helpers';
import { bytes } from '@ckb-lumos/codec';
import { utils, type Cell, type HexString, type Script } from '@ckb-lumos/base';
import { ScriptInfo } from '../commons/types';
import { getOffChainLocks, getOnChainLocks } from '../commons/nexusTools';

export const getArgs = (scriptInfo: ScriptInfo): string => {
  if (isScript(scriptInfo)) {
    return (scriptInfo as Script).args;
  }
  if (isArgs(scriptInfo)) {
    return scriptInfo as HexString;
  }
  throw new Error('Invalid scriptInfo');
};

export const getSecp256k1Blake160Config = (blockchainConfig: config.Config): config.ScriptConfig => {
  const res = blockchainConfig.SCRIPTS.SECP256K1_BLAKE160;
  if (!res) {
    throw new Error('SECP256K1_BLAKE160 is not defined in config');
  }
  return res;
};

export const getSUDTConfig = (blockchainConfig: config.Config): config.ScriptConfig => {
  const res = blockchainConfig.SCRIPTS.SUDT;
  if (!res) {
    throw new Error('SUDT is not defined in config');
  }
  return res;
};

export const getChequeConfig = (blockchainConfig: config.Config): config.ScriptConfig => {
  const res = blockchainConfig.SCRIPTS.CHEQUE;
  if (!res) {
    throw new Error('CHEQUE is not defined in config');
  }
  return res;
};

export const getSecp256k1Lock = (payload: { scriptInfo: ScriptInfo; blockchainConfig: config.Config }): Script => {
  const SECP256K1_BLAKE160 = getSecp256k1Blake160Config(payload.blockchainConfig);
  return {
    codeHash: SECP256K1_BLAKE160.CODE_HASH,
    hashType: SECP256K1_BLAKE160.HASH_TYPE,
    args: getArgs(payload.scriptInfo),
  };
};

export const getSUDTType = (payload: { scriptInfo: ScriptInfo; blockchainConfig: config.Config }): Script => {
  const SUDT = getSUDTConfig(payload.blockchainConfig);
  return {
    codeHash: SUDT.CODE_HASH,
    hashType: SUDT.HASH_TYPE,
    args: getArgs(payload.scriptInfo),
  };
};

export const isSUDTScript = (payload: { script: Script; blockchainConfig: config.Config }): boolean => {
  const SUDT = getSUDTConfig(payload.blockchainConfig);
  return payload.script.codeHash === SUDT.CODE_HASH && payload.script.hashType === SUDT.HASH_TYPE;
};

export const isPureCkbCell = (cell: Cell): boolean => {
  return !cell.cellOutput.type && cell.data === '0x';
};

export const isTargetSUDTCell = (payload: { cell: Cell; scriptInfo: ScriptInfo }): boolean => {
  return !!payload.cell.cellOutput.type && payload.cell.cellOutput.type.args === getArgs(payload.scriptInfo);
};

export const getChequeLock = (payload: {
  sender: ScriptInfo;
  receiver: ScriptInfo;
  blockchainConfig: config.Config;
}): Script => {
  const senderLockHash = utils
    .computeScriptHash(getSecp256k1Lock({ scriptInfo: payload.sender, blockchainConfig: payload.blockchainConfig }))
    .slice(0, 42);
  const receiverLockHash = utils
    .computeScriptHash(getSecp256k1Lock({ scriptInfo: payload.receiver, blockchainConfig: payload.blockchainConfig }))
    .slice(0, 42);
  const CHEQUE = getChequeConfig(payload.blockchainConfig);
  return {
    codeHash: CHEQUE.CODE_HASH,
    hashType: CHEQUE.HASH_TYPE,
    args: bytes.hexify(bytes.concat(receiverLockHash, senderLockHash)),
  };
};

export const setCreateChequeCellDeps = (payload: {
  txSkeleton: helpers.TransactionSkeletonType;
  blockchainConfig: config.Config;
}): helpers.TransactionSkeletonType => {
  const SECP256K1_BLAKE160 = getSecp256k1Blake160Config(payload.blockchainConfig);
  const SUDT = getSUDTConfig(payload.blockchainConfig);
  return setCellDeps(payload.txSkeleton, [SECP256K1_BLAKE160, SUDT]);
};

export const setClaimChequeCellDeps = (payload: {
  txSkeleton: helpers.TransactionSkeletonType;
  blockchainConfig: config.Config;
}): helpers.TransactionSkeletonType => {
  const SECP256K1_BLAKE160 = getSecp256k1Blake160Config(payload.blockchainConfig);
  const SUDT = getSUDTConfig(payload.blockchainConfig);
  const CHEQUE = getChequeConfig(payload.blockchainConfig);
  return setCellDeps(payload.txSkeleton, [SECP256K1_BLAKE160, SUDT, CHEQUE]);
};

const setCellDeps = (
  txSkeleton: helpers.TransactionSkeletonType,
  scriptConfigs: config.ScriptConfig[],
): helpers.TransactionSkeletonType => {
  const res = txSkeleton.update('cellDeps', (cellDeps) => {
    return cellDeps.clear();
  });
  const deps = scriptConfigs.map((scriptConfig) => ({
    outPoint: {
      txHash: scriptConfig.TX_HASH,
      index: scriptConfig.INDEX,
    },
    depType: scriptConfig.DEP_TYPE,
  }));
  return res.update('cellDeps', (cellDeps) => {
    return cellDeps.concat(...deps);
  });
};

const isScript = (scriptInfo: ScriptInfo): boolean => {
  if (typeof scriptInfo === 'object' && scriptInfo.codeHash && scriptInfo.hashType && scriptInfo.args) {
    return true;
  }
  return false;
};

const isArgs = (scriptInfo: ScriptInfo): boolean => {
  if (typeof scriptInfo === 'string' && scriptInfo.startsWith('0x')) {
    return true;
  }
  return false;
};
