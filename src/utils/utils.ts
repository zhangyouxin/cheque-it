import { Cell, Script, utils } from '@ckb-lumos/base';
import { BI, formatUnit } from '@ckb-lumos/bi';
import numeral from 'numeral';

export const formatDisplayCapacity = (capacity: BI) => {
  return numeral(formatUnit(capacity, 'ckb')).format('0,0[.][00000000]');
};

export const formatDisplaySUDTAmount = (sUDTAmount: BI, decimals = 18) => {
  return numeral(sUDTAmount.div(10 ** decimals)).format('0,0[.][00000000]');
};

export const scriptEqual = (script1: Script, script2: Script): boolean => {
  return utils.computeScriptHash(script1) === utils.computeScriptHash(script2);
};

export const cellListCapacity = (cells: Cell[]): BI => {
  return cells.reduce((acc, cell) => {
    return acc.add(cell.cellOutput.capacity);
  }, BI.from(0));
};

export const formatDisplayAddress = (address: string) => {
  if (address.length <= 16) return address;
  return address.slice(0, 3) + '...' + address.slice(-6);
};
