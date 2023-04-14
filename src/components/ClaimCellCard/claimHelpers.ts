import { Script } from '@ckb-lumos/base';
import { ResolvableCell } from '../../commons/types';
import { NetworkConfig } from '../../commons/networks';
import { RPC } from '@ckb-lumos/rpc';

export const getSenderLock = async (cheque: ResolvableCell, networkConfig: NetworkConfig): Promise<Script> => {
  const rpc = new RPC(networkConfig.rpcUrl);
  const txHash = cheque.outPoint.txHash;
  const tx = await rpc.getTransaction(txHash);
  const txOutputsCount = tx.transaction.outputs.length;
  // the last cell has the sender lock
  const senderCell = tx.transaction.outputs[txOutputsCount - 1];
  return senderCell.lock;
};
