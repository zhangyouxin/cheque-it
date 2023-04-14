import { HexString, Script, Transaction, WitnessArgs, blockchain, helpers, values } from '@ckb-lumos/base';
import { RPC } from '@ckb-lumos/rpc';
import { bytes } from '@ckb-lumos/codec';
import { createTransactionFromSkeleton, type TransactionSkeletonType } from '@ckb-lumos/helpers';
import { NetworkConfig } from '../commons/networks';
import { BI } from '@ckb-lumos/bi';
import { PREPARE_FEE_SHANNON } from '../commons/consts';
import { CKBHasher, ckbHash } from '@ckb-lumos/base/lib/utils';

export function completeTx(payload: {
  signatures: [Script, string][];
  txSkeleton: TransactionSkeletonType;
  chequeSignature?: string;
}): Transaction {
  const tx = createTransactionFromSkeleton(payload.txSkeleton);
  const inputCells = payload.txSkeleton.get('inputs').toArray();
  const inputArgs = inputCells.map((cell) => cell.cellOutput.lock.args);
  for (let index = 0; index < payload.signatures.length; index++) {
    const [lock, sig] = payload.signatures[index];
    const newWitnessArgs: WitnessArgs = {
      lock: sig,
    };
    const newWitness = bytes.hexify(blockchain.WitnessArgs.pack(newWitnessArgs));
    const inputIndex = inputArgs.findIndex((arg) => arg === lock.args);
    tx.witnesses[inputIndex] = newWitness;
  }
  if (payload.chequeSignature) {
    tx.witnesses[0] = bytes.hexify(
      blockchain.WitnessArgs.pack({
        lock: payload.chequeSignature,
      }),
    );
  }
  return tx;
}

export async function sendTx(payload: { tx: Transaction; networkConfig: NetworkConfig }): Promise<string> {
  const rpc = new RPC(payload.networkConfig.rpcUrl);
  const txHash = await rpc.sendTransaction(payload.tx);
  return txHash;
}

// the last output cell can be used to pay fee
export function payFee(txSkeleton: TransactionSkeletonType, fee = PREPARE_FEE_SHANNON): TransactionSkeletonType {
  const feeCell = txSkeleton.get('outputs').last()!;
  feeCell.cellOutput.capacity = BI.from(feeCell.cellOutput.capacity).sub(fee).toHexString();
  txSkeleton.update('outputs', (outputs) => outputs.set(-1, feeCell));
  return txSkeleton;
}

// The first cell in the output is the cheque cell when claiming cheque
export function getChequeSignMessage(txSkeleton: TransactionSkeletonType): string {
  const tx = createTransactionFromSkeleton(txSkeleton);
  const txHash = ckbHash(blockchain.RawTransaction.pack(tx));
  const witnesses = txSkeleton.get('witnesses').get(0)!;
  const hasher = new CKBHasher();
  hasher.update(txHash);
  hashWitness(hasher, witnesses);
  const message = hasher.digestHex();
  return message;
}

/**
 * Hash a witness in a hasher
 * @param hasher The hasher object which should have a `update` method.
 * @param witness witness data, the inputs to hasher will derived from it
 */
export function hashWitness(hasher: { update: (value: HexString | ArrayBuffer) => unknown }, witness: HexString): void {
  const lengthBuffer = new ArrayBuffer(8);
  const view = new DataView(lengthBuffer);
  const witnessHexString = BI.from(bytes.bytify(witness).length).toString(16);
  if (witnessHexString.length <= 8) {
    view.setUint32(0, Number('0x' + witnessHexString), true);
    view.setUint32(4, Number('0x' + '00000000'), true);
  }

  if (witnessHexString.length > 8 && witnessHexString.length <= 16) {
    view.setUint32(0, Number('0x' + witnessHexString.slice(-8)), true);
    view.setUint32(4, Number('0x' + witnessHexString.slice(0, -8)), true);
  }
  hasher.update(lengthBuffer);
  hasher.update(witness);
}
