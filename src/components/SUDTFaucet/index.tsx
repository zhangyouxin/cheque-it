import { bytes } from '@ckb-lumos/codec';
import { Cell, CellDep, HexString, Script, Transaction, blockchain, utils } from '@ckb-lumos/base';
import * as helpers from '@ckb-lumos/helpers';
import * as hd from '@ckb-lumos/hd';
import { number } from '@ckb-lumos/codec';
import { BI } from '@ckb-lumos/bi';
import { Indexer } from '@ckb-lumos/ckb-indexer';
import { RPC } from '@ckb-lumos/rpc';
import { useNetwork } from '../../hooks/useNetwork';
import { Config } from '@ckb-lumos/config-manager/lib';
import { NetworkConfig } from '../../commons/networks';
import { getSUDTConfig, getSecp256k1Blake160Config, isPureCkbCell } from '../../utils/blockchainUtils';
import { ecdsaSign } from 'secp256k1';
import { DEFAULT_TX_FEE_SHANNON, SUDT_CKB_AMOUNT_BI } from '../../commons/consts';
import { getAllLiveCells } from '../../commons/nexusTools';

// The private key for transferring SUDT
const DEFAULT_ISSUER_PRIVATE_KEY = process.env.REACT_APP_L1_TEST_TOKEN_ISSUER_PRIVATE_KEY!;

export async function claimTTKN(params: { receiverAddress: string; issuerPrivateKey?: HexString }): Promise<HexString> {
  const { networkConfig, blockchainConfig } = useNetwork();
  const rpc = new RPC(networkConfig.rpcUrl);
  let txSkeleton = await generateClaimUSDCTxSkeleton(
    params.receiverAddress,
    networkConfig,
    blockchainConfig,
    params.issuerPrivateKey,
  );
  const issuerSignature = await issuerSignTransaction(txSkeleton, params.issuerPrivateKey);
  txSkeleton = txSkeleton.update('witnesses', (witnesses) => {
    const lenth = witnesses.size;
    return witnesses.update(lenth - 1, () => issuerSignature);
  });
  const issuerSignedTx = helpers.createTransactionFromSkeleton(txSkeleton);

  const tx: Transaction = await window.ckb.request({method: 'wallet_fullOwnership_signTransaction', params: { tx: issuerSignedTx }});

  const txHash = await rpc.sendTransaction(tx, 'passthrough');
  console.debug('claim sudt txHash is:', txHash);
  return txHash;
}

export async function generateClaimUSDCTxSkeleton(
  address: string,
  networkConfig: NetworkConfig,
  blockchainConfig: Config,
  issuerPrivateKey?: HexString,
): Promise<helpers.TransactionSkeletonType> {
  const indexer = new Indexer(networkConfig.rpcUrl);
  const SECT256K1_BLAKE160 = getSecp256k1Blake160Config(blockchainConfig);
  const issuerPubKey = hd.key.privateToPublic(issuerPrivateKey || DEFAULT_ISSUER_PRIVATE_KEY);
  const issuerArgs = hd.key.publicKeyToBlake160(issuerPubKey);
  const issuerLock: Script = {
    codeHash: SECT256K1_BLAKE160.CODE_HASH,
    hashType: SECT256K1_BLAKE160.HASH_TYPE,
    args: issuerArgs,
  };
  const sudtType: Script = {
    codeHash: getSUDTConfig(blockchainConfig).CODE_HASH,
    hashType: getSUDTConfig(blockchainConfig).HASH_TYPE,
    args: utils.computeScriptHash(issuerLock),
  };

  const receiverLock: Script = helpers.parseAddress(address, { config: blockchainConfig });

  const sudtCellCapacity = SUDT_CKB_AMOUNT_BI;
  const needCkb = sudtCellCapacity.add(DEFAULT_TX_FEE_SHANNON);

  let txSkeleton = helpers.TransactionSkeleton({ cellProvider: indexer });

  const cells = await getAllLiveCells(window.ckb);
  let collectedSum = BI.from(0);
  const collectedCells: Cell[] = [];

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (isPureCkbCell(cell) && collectedSum.lt(needCkb)) {
      collectedCells.push(cell);
      collectedSum = collectedSum.add(BI.from(cell.cellOutput.capacity));
    } else {
      continue;
    }
  }
  if (collectedSum.lt(needCkb)) {
    throw new Error('Not enough CKB, go get some CKB from faucet.');
  }

  // collect one isuer cell, so that the issuer will need to sign the transaction, which is essential in sudt mint
  const issuerCellCollector = indexer.collector({
    lock: issuerLock,
    type: 'empty',
    outputDataLenRange: ['0x0', '0x1'],
  });
  let issuerCellCapacity = BI.from(0);
  for await (const cell of issuerCellCollector.collect()) {
    issuerCellCapacity = issuerCellCapacity.add(cell.cellOutput.capacity);
    collectedCells.push(cell);
    break;
  }

  txSkeleton = txSkeleton.update('inputs', (inputs) => {
    return inputs.push(...collectedCells);
  });
  const sudtCell: Cell = {
    cellOutput: {
      capacity: sudtCellCapacity.toHexString(),
      lock: receiverLock,
      type: sudtType,
    },
    data: bytes.hexify(number.Uint128LE.pack(BI.from(1000).mul(BI.from(10).pow(18)))), // 1000 sudt in uint128
  };
  const exchangeCell: Cell = {
    cellOutput: {
      capacity: collectedSum.sub(sudtCellCapacity).sub(DEFAULT_TX_FEE_SHANNON).toHexString(),
      lock: receiverLock,
    },
    data: '0x',
  };
  const issuerExchangeCell: Cell = {
    cellOutput: {
      capacity: issuerCellCapacity.toHexString(),
      lock: issuerLock,
    },
    data: '0x',
  };
  txSkeleton = txSkeleton.update('outputs', (outputs) => {
    return outputs.push(exchangeCell, sudtCell, issuerExchangeCell);
  });

  txSkeleton = txSkeleton.update('cellDeps', (cellDeps) => {
    return cellDeps.push(...getClaimSUDTCellDeps(blockchainConfig));
  });

  return txSkeleton;
}

function getClaimSUDTCellDeps(blockchainConfig: Config): CellDep[] {
  const secp256k1 = getSecp256k1Blake160Config(blockchainConfig);
  const sudt = getSUDTConfig(blockchainConfig);

  return [
    {
      outPoint: {
        txHash: secp256k1.TX_HASH,
        index: secp256k1.INDEX,
      },
      depType: secp256k1.DEP_TYPE,
    },
    {
      outPoint: {
        txHash: sudt.TX_HASH,
        index: sudt.INDEX,
      },
      depType: sudt.DEP_TYPE,
    },
  ];
}

async function issuerSignTransaction(
  txSkeleton: helpers.TransactionSkeletonType,
  issuerPrivateKey?: HexString,
): Promise<HexString> {
  const message = generateIssuerMessage(txSkeleton);
  let signedMessage = await signMessageWithPrivateKey(message, issuerPrivateKey ?? DEFAULT_ISSUER_PRIVATE_KEY);
  let v = Number.parseInt(signedMessage.slice(-2), 16);
  if (v >= 27) v -= 27;
  signedMessage = '0x' + signedMessage.slice(2, -2) + v.toString(16).padStart(2, '0');
  return bytes.hexify(
    blockchain.WitnessArgs.pack({
      lock: bytes.bytify(signedMessage).buffer,
    }),
  );
}

function generateIssuerMessage(tx: helpers.TransactionSkeletonType): HexString {
  const hasher = new utils.CKBHasher();
  const rawTxHash = utils.ckbHash(blockchain.RawTransaction.pack(helpers.createTransactionFromSkeleton(tx)).buffer);
  hasher.update(rawTxHash);
  const serializedSudtWitness = blockchain.WitnessArgs.pack({
    lock: bytes.bytify(`0x${'00'.repeat(65)}`).buffer,
  });
  hashWitness(hasher, serializedSudtWitness.buffer);
  return hasher.digestHex();
}

function hashWitness(hasher: utils.CKBHasher, witness: ArrayBuffer): void {
  const packedLength = number.Uint64LE.pack(witness.byteLength);
  hasher.update(packedLength.buffer);
  hasher.update(witness);
}

async function signMessageWithPrivateKey(message: string, privkey: string) {
  const signObject = ecdsaSign(bytes.bytify(message), bytes.bytify(privkey));
  const signatureBuffer = new ArrayBuffer(65);
  const signatureArray = new Uint8Array(signatureBuffer);
  signatureArray.set(signObject.signature, 0);
  signatureArray.set([signObject.recid], 64);
  return bytes.hexify(signatureBuffer);
}
