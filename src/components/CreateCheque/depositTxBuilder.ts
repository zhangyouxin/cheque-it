import { bytes } from '@ckb-lumos/codec';
import { type Cell, type WitnessArgs, blockchain } from '@ckb-lumos/base';
import * as helpers from '@ckb-lumos/helpers';
import { BI } from '@ckb-lumos/bi';
import * as config from '@ckb-lumos/config-manager';
import { ScriptInfo } from '../../commons/types';
import { CELL_MIN_CKB_BI, DEPOSIT_CKB_AMOUNT_BI, PREPARE_FEE_SHANNON, SUDT_CKB_AMOUNT_BI } from '../../commons/consts';
import { NetworkConfig } from '../../commons/networks';
import {
  getChequeLock,
  getSUDTType,
  getSecp256k1Lock,
  isPureCkbCell,
  isTargetSUDTCell,
  setCreateChequeCellDeps,
} from '../../utils/blockchainUtils';
import { Uint128LE } from '@ckb-lumos/codec/lib/number';
import { Indexer } from '@ckb-lumos/ckb-indexer';
import { payFee } from '../../utils/txUtils';

export function buildDepositTx(payload: {
  blockchainConfig: config.Config;
  networkConfig: NetworkConfig;
  sudtTypeInfo: ScriptInfo;
  sudtAmount: BI;
  senderInfo: ScriptInfo;
  receiverInfo: ScriptInfo;
  collectedCells: Cell[];
  changeLock: ScriptInfo;
  depositAll?: boolean;
}) {
  const {
    cells: selectedCells,
    capacity: selectedCapacity,
    sUDTAmount: selectedSUDTAmount,
  } = selectCellsToProcess({
    cells: payload.collectedCells,
    sUDTAmount: payload.sudtAmount,
    depositAll: payload.depositAll,
    sudtTypeInfo: payload.sudtTypeInfo,
  });

  const indexer = new Indexer(payload.networkConfig.rpcUrl);
  let txSkeleton = helpers.TransactionSkeleton({ cellProvider: indexer });
  txSkeleton = txSkeleton.update('inputs', (inputs) => {
    return inputs.concat(...selectedCells);
  });

  const outputCells: Cell[] = [];
  outputCells[0] = {
    cellOutput: {
      capacity: DEPOSIT_CKB_AMOUNT_BI.toHexString(),
      lock: getChequeLock({
        sender: payload.senderInfo,
        receiver: payload.receiverInfo,
        blockchainConfig: payload.blockchainConfig,
      }),
      type: getSUDTType({ scriptInfo: payload.sudtTypeInfo, blockchainConfig: payload.blockchainConfig }),
    },
    data: bytes.hexify(Uint128LE.pack(payload.sudtAmount)),
  };
  const changeCells = generateChangeCells({
    selectedCapacity,
    selectedSUDTAmount,
    changeLockInfo: payload.changeLock,
    depositSUDTAmount: payload.sudtAmount,
    sudtTypeInfo: payload.sudtTypeInfo,
    blockchainConfig: payload.blockchainConfig,
    depositAll: payload.depositAll,
  });
  txSkeleton = txSkeleton.update('outputs', (outputs) => {
    return outputs.concat(...outputCells, ...changeCells);
  });
  txSkeleton = setCreateChequeCellDeps({ txSkeleton, blockchainConfig: payload.blockchainConfig });
  for (let i = 0; i < selectedCells.length; i++) {
    txSkeleton = txSkeleton.update('witnesses', (witnesses) => witnesses.push('0x'));
  }
  const witnessArgs: WitnessArgs = {
    lock: bytes.hexify(new Uint8Array(65)),
  };
  const secp256k1Witness = bytes.hexify(blockchain.WitnessArgs.pack(witnessArgs));
  for (let i = 0; i < selectedCells.length; i++) {
    txSkeleton = txSkeleton.update('witnesses', (witnesses) => witnesses.set(i, secp256k1Witness));
  }
  txSkeleton = payFee(txSkeleton);
  console.log('txSkeleton', helpers.transactionSkeletonToObject(txSkeleton));
  const tx = helpers.createTransactionFromSkeleton(txSkeleton);
  return { tx, txSkeleton };
}

// make sure the last output cell can be used to pay fee
function generateChangeCells(payload: {
  selectedCapacity: BI;
  depositSUDTAmount: BI;
  selectedSUDTAmount: BI;
  changeLockInfo: ScriptInfo;
  sudtTypeInfo: ScriptInfo;
  blockchainConfig: config.Config;
  depositAll?: boolean;
}): Cell[] {
  const changeCells: Cell[] = [];
  const changeCapacity = payload.selectedCapacity.sub(DEPOSIT_CKB_AMOUNT_BI);
  if (payload.depositAll) {
    // transfer all
    changeCells[0] = {
      cellOutput: {
        capacity: changeCapacity.toHexString(),
        lock: getSecp256k1Lock({ scriptInfo: payload.changeLockInfo, blockchainConfig: payload.blockchainConfig }),
      },
      data: '0x',
    };
  } else {
    // need sUDT change
    // if change capacity is less than 61, we need to put it in the sUDT cell
    if (changeCapacity.lt(CELL_MIN_CKB_BI.add(PREPARE_FEE_SHANNON))) {
      changeCells[0] = {
        cellOutput: {
          capacity: changeCapacity.toHexString(),
          lock: getSecp256k1Lock({ scriptInfo: payload.changeLockInfo, blockchainConfig: payload.blockchainConfig }),
          type: getSUDTType({ scriptInfo: payload.sudtTypeInfo, blockchainConfig: payload.blockchainConfig }),
        },
        data: bytes.hexify(Uint128LE.pack(payload.selectedSUDTAmount.sub(payload.depositSUDTAmount))),
      };
    } else {
      changeCells[0] = {
        cellOutput: {
          capacity: SUDT_CKB_AMOUNT_BI.toHexString(),
          lock: getSecp256k1Lock({ scriptInfo: payload.changeLockInfo, blockchainConfig: payload.blockchainConfig }),
          type: getSUDTType({ scriptInfo: payload.sudtTypeInfo, blockchainConfig: payload.blockchainConfig }),
        },
        data: bytes.hexify(Uint128LE.pack(payload.selectedSUDTAmount.sub(payload.depositSUDTAmount))),
      };
      changeCells[1] = {
        cellOutput: {
          capacity: changeCapacity.sub(SUDT_CKB_AMOUNT_BI).toHexString(),
          lock: getSecp256k1Lock({ scriptInfo: payload.changeLockInfo, blockchainConfig: payload.blockchainConfig }),
        },
        data: '0x',
      };
    }
  }
  return changeCells;
}

// we only collect enough sUDT to deposit and enough CKBytes to create cheque cell
function selectCellsToProcess(payload: {
  cells: Cell[];
  sUDTAmount: BI;
  sudtTypeInfo: ScriptInfo;
  depositAll?: boolean;
}): { cells: Cell[]; capacity: BI; sUDTAmount: BI } {
  const selectedCells: Cell[] = [];
  let selectedCapacity = BI.from(0);
  let selectedSUDTAmount = BI.from(0);

  for (let i = 0; i < payload.cells.length; i++) {
    const cell = payload.cells[i];
    if (isPureCkbCell(cell) && !isCKBytesEnoughToDeposit(selectedCapacity)) {
      selectedCells.push(cell);
      selectedCapacity = selectedCapacity.add(BI.from(cell.cellOutput.capacity));
    } else if (
      isTargetSUDTCell({ cell, scriptInfo: payload.sudtTypeInfo }) &&
      (!isSUDTEnoughToDeposit(selectedSUDTAmount, payload.sUDTAmount) || payload.depositAll)
    ) {
      selectedCells.push(cell);
      selectedCapacity = selectedCapacity.add(BI.from(cell.cellOutput.capacity));
      selectedSUDTAmount = selectedSUDTAmount.add(Uint128LE.unpack(cell.data));
    } else {
      continue;
    }
  }

  if (!isCKBytesEnoughToDeposit(selectedCapacity)) {
    throw new Error('CKBytes is not enough to deposit');
  }
  if (!payload.depositAll && !isSUDTEnoughToDeposit(selectedSUDTAmount, payload.sUDTAmount)) {
    console.log('selectedSUDTAmount', payload.sUDTAmount.toString(), selectedCells, selectedSUDTAmount.toString());

    throw new Error('sUDT is not enough to deposit');
  }
  return { cells: selectedCells, capacity: selectedCapacity, sUDTAmount: selectedSUDTAmount };
}

// check if CKBytes is enough to deposit and create cheque cell
const isCKBytesEnoughToDeposit = (capacity: BI) => {
  return capacity.sub(PREPARE_FEE_SHANNON).sub(DEPOSIT_CKB_AMOUNT_BI).gte(0);
};

// check if sudt is enough
const isSUDTEnoughToDeposit = (amount: BI, target: BI) => {
  return amount.gte(target);
};
