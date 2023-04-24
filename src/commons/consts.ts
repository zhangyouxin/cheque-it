import { BI } from '@ckb-lumos/bi';

// deposit 165 CKBytes to create a new cheque cell, this will be returned to user when the cheque is claimed/withdrawn
export const DEPOSIT_CKB_AMOUNT = 165;

export const DEPOSIT_CKB_AMOUNT_BI = BI.from(DEPOSIT_CKB_AMOUNT).mul(1e8);

// deposit 142 CKBytes to create a new SUDT cell
export const SUDT_CKB_AMOUNT = 142;

export const SUDT_CKB_AMOUNT_BI = BI.from(SUDT_CKB_AMOUNT).mul(1e8);

// deposit 142 CKBytes to create a new cheque cell, this will be returned to user when the cheque is claimed/withdrawn
export const CELL_MIN_CKB = 61;

export const CELL_MIN_CKB_BI = BI.from(CELL_MIN_CKB).mul(1e8);

// prepare enough CKBytes to pay tx fee
export const PREPARE_FEE_SHANNON = 1e6;

// TX FEE
export const DEFAULT_TX_FEE_SHANNON = 1e6;

export const DEFAULT_PAGE_SIZE = 10;
