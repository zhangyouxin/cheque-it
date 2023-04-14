import { bytes } from '@ckb-lumos/codec';
import { type Cell, blockchain, Script } from '@ckb-lumos/base';
import * as helpers from '@ckb-lumos/helpers';
import { BI } from '@ckb-lumos/bi';
import * as config from '@ckb-lumos/config-manager';
import { ScriptInfo } from '../../commons/types';
import { CELL_MIN_CKB_BI, PREPARE_FEE_SHANNON, SUDT_CKB_AMOUNT_BI } from '../../commons/consts';
import { NetworkConfig } from '../../commons/networks';
import { getSUDTType, isPureCkbCell, setClaimChequeCellDeps } from '../../utils/blockchainUtils';
import { Indexer } from '@ckb-lumos/ckb-indexer';
import { getChequeSignMessage } from '../../utils/txUtils';

export function buildClaimTx(payload: {
  blockchainConfig: config.Config;
  networkConfig: NetworkConfig;
  cheque: Cell;
  receiverLock: Script;
  senderLock: Script;
  collectedCells: Cell[];
}) {
  const sudtTypeInfo: Script = payload.cheque.cellOutput.type!;
  const { cells: selectedCells, capacity: selectedCapacity } = selectCellsToProcess({
    cells: payload.collectedCells,
    sudtTypeInfo: sudtTypeInfo,
  });

  const indexer = new Indexer(payload.networkConfig.rpcUrl);
  let txSkeleton = helpers.TransactionSkeleton({ cellProvider: indexer });
  txSkeleton = txSkeleton.update('inputs', (inputs) => {
    return inputs.concat(payload.cheque, ...selectedCells);
  });

  const { receiveCheque, returnSenderCell, changeCell } = createOutputCells({
    selectedCapacity,
    cheque: payload.cheque,
    receiverLock: payload.receiverLock,
    senderLock: payload.senderLock,
    sudtTypeInfo: sudtTypeInfo,
    blockchainConfig: payload.blockchainConfig,
  });

  txSkeleton = txSkeleton.update('outputs', (outputs) => {
    // make sure the last output is change cell, it is used to pay fee
    return outputs.concat(receiveCheque, returnSenderCell, changeCell);
  });
  txSkeleton = setClaimChequeCellDeps({ txSkeleton, blockchainConfig: payload.blockchainConfig });
  const secp256k1Witness = bytes.hexify(
    blockchain.WitnessArgs.pack({
      lock: bytes.hexify(new Uint8Array(65)),
    }),
  );
  for (let i = 0; i < txSkeleton.get('inputs').size; i++) {
    txSkeleton = txSkeleton.update('witnesses', (witnesses) => witnesses.push(secp256k1Witness));
  }
  txSkeleton = payFee(txSkeleton);
  const chequeSignMessage = getChequeSignMessage(txSkeleton);
  console.log('txSkeleton', helpers.transactionSkeletonToObject(txSkeleton));
  const tx = helpers.createTransactionFromSkeleton(txSkeleton);
  return { tx, txSkeleton, chequeSignMessage };
}

// the last output cell can be used to pay fee
function payFee(
  txSkeleton: helpers.TransactionSkeletonType,
  fee = PREPARE_FEE_SHANNON,
): helpers.TransactionSkeletonType {
  const feeCell = txSkeleton.get('outputs').last()!;
  feeCell.cellOutput.capacity = BI.from(feeCell.cellOutput.capacity).sub(fee).toHexString();
  txSkeleton.update('outputs', (outputs) => outputs.set(-1, feeCell));
  return txSkeleton;
}

// we only collect enough sUDT to deposit and enough CKBytes to create cheque cell
function selectCellsToProcess(payload: { cells: Cell[]; sudtTypeInfo: ScriptInfo }): {
  cells: Cell[];
  capacity: BI;
  sUDTAmount: BI;
} {
  // TODO use existing sudt cell(if there is any) to receive cheque
  const selectedCells: Cell[] = [];
  let selectedCapacity = BI.from(0);
  const selectedSUDTAmount = BI.from(0);

  for (let i = 0; i < payload.cells.length; i++) {
    const cell = payload.cells[i];
    if (isPureCkbCell(cell) && !isCKBytesEnoughToClaim(selectedCapacity)) {
      selectedCells.push(cell);
      selectedCapacity = selectedCapacity.add(BI.from(cell.cellOutput.capacity));
    } else {
      continue;
    }
  }
  if (!isCKBytesEnoughToClaim(selectedCapacity)) {
    throw new Error('CKBytes is not enough to claim');
  }
  return { cells: selectedCells, capacity: selectedCapacity, sUDTAmount: selectedSUDTAmount };
}

function createOutputCells(payload: {
  selectedCapacity: BI;
  senderLock: Script;
  receiverLock: Script;
  cheque: Cell;
  sudtTypeInfo: ScriptInfo;
  blockchainConfig: config.Config;
}): { receiveCheque: Cell; returnSenderCell: Cell; changeCell: Cell } {
  // receive SUDT in cheque
  const receiveCheque: Cell = {
    cellOutput: {
      capacity: SUDT_CKB_AMOUNT_BI.toHexString(),
      lock: payload.receiverLock,
      type: getSUDTType({ scriptInfo: payload.sudtTypeInfo, blockchainConfig: payload.blockchainConfig }),
    },
    data: payload.cheque.data!,
  };

  // return all CKBytes in cheque to sender
  const returnSenderCell: Cell = {
    cellOutput: {
      capacity: payload.cheque.cellOutput.capacity,
      lock: payload.senderLock,
    },
    data: '0x',
  };

  // CKByte changes afer all
  const changeCell: Cell = {
    cellOutput: {
      capacity: payload.selectedCapacity.sub(SUDT_CKB_AMOUNT_BI).toHexString(),
      lock: payload.receiverLock,
    },
    data: '0x',
  };
  return { receiveCheque, returnSenderCell, changeCell };
}

// need 61 + 142 + 0.01 = 203.01 CKBytes
const isCKBytesEnoughToClaim = (capacity: BI) => {
  return capacity.sub(PREPARE_FEE_SHANNON).sub(SUDT_CKB_AMOUNT_BI).sub(CELL_MIN_CKB_BI).gte(0);
};
