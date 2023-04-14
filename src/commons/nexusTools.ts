import { type Cell, type Script } from '@ckb-lumos/base';

export const DEFAULT_NEXUS_PAGE_SIZE = 20;

export const getAllLocks = async (ckb: typeof window.ckb): Promise<Script[]> => {
  const offChainLocksExternal = await getOffChainLocks(ckb, 'external');
  const offChainLocksInternal = await getOffChainLocks(ckb, 'internal');
  const onChainLocks = await getOnChainLocks(ckb);
  const locks = [...offChainLocksExternal, ...offChainLocksInternal, ...onChainLocks];
  return locks;
};

export const getOffChainLocks = async (
  ckb: typeof window.ckb,
  type: 'internal' | 'external' = 'external',
): Promise<Script[]> => {
  return ckb.request({
    method: 'wallet_fullOwnership_getOffChainLocks',
    params: { change: type },
  });
};

export const getOnChainLocks = async (ckb: typeof window.ckb) => {
  const locks: Script[] = [];
  // get first page
  let onChainInfos = await ckb.request({
    method: 'wallet_fullOwnership_getOnChainLocks',
    params: {},
  });
  locks.push(...onChainInfos.objects);
  // if the first page has DEFAULT_NEXUS_PAGE_SIZE items, then there are more pages, nexus default page size is DEFAULT_NEXUS_PAGE_SIZE
  while (onChainInfos.objects.length === DEFAULT_NEXUS_PAGE_SIZE) {
    onChainInfos = await ckb.request({
      method: 'wallet_fullOwnership_getOnChainLocks',
      params: { cursor: onChainInfos.cursor },
    });
    locks.push(...onChainInfos.objects);
  }
  return locks;
};

export const getAllLiveCells = async (ckb: typeof window.ckb): Promise<Cell[]> => {
  let fullOwnershipCells: Cell[] = [];
  // get first page of live cells
  let liveCellsResult = await ckb.request({
    method: 'wallet_fullOwnership_getLiveCells',
    params: {},
  });

  fullOwnershipCells.push(...liveCellsResult.objects);
  // if the first page has DEFAULT_NEXUS_PAGE_SIZE items, then there are more pages, nexus default page size is DEFAULT_NEXUS_PAGE_SIZE
  while (liveCellsResult.objects.length === DEFAULT_NEXUS_PAGE_SIZE) {
    liveCellsResult = await ckb.request({
      method: 'wallet_fullOwnership_getLiveCells',
      params: { cursor: liveCellsResult.cursor },
    });

    fullOwnershipCells.push(...liveCellsResult.objects);
  }

  // filter pure CKB cell
  fullOwnershipCells = fullOwnershipCells.filter(
    (item) =>
      // secp256k1 code hash, refer to:
      // https://github.com/nervosnetwork/rfcs/blob/5ccfef8a5e51c6f13179452d3589f247eae55554/rfcs/0024-ckb-genesis-script-list/0024-ckb-genesis-script-list.md#secp256k1blake160
      item.cellOutput.lock.codeHash === '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8' &&
      item.cellOutput.lock.hashType === 'type',
  );

  return fullOwnershipCells;
};
