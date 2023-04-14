import * as React from 'react';
import { Box } from '@chakra-ui/react';
import { Cell, Hash, Script, utils } from '@ckb-lumos/base';
import { RPC as RpcType } from '@ckb-lumos/rpc/lib/types/rpc';
import { getAllLocks, getOffChainLocks, getOnChainLocks } from '../../commons/nexusTools';
import { useEffect } from 'react';
import { createRpcClient, toCell } from '../../utils/backendUtils';
import { useNetwork } from '../../hooks/useNetwork';
import { getChequeConfig } from '../../utils/blockchainUtils';
import { ClaimCellCard } from '../ClaimCellCard';
import { ResolvableCell } from '../../commons/types';

type ChequeBook = Record<Hash, { lock: Script; cheques: ResolvableCell[] }>;

export function ClaimPanel(props: { ckb?: typeof window.ckb }) {
  if (!props.ckb) return null;
  const { networkConfig, blockchainConfig } = useNetwork();
  const chequeConfig = getChequeConfig(blockchainConfig);
  const client = createRpcClient(networkConfig.rpcUrl);

  const [chequeBook, setChequeBook] = React.useState<ChequeBook>({});

  useEffect(() => {
    const fetchCheques = async () => {
      const locks = await getAllLocks(props.ckb!);
      const lockHashes = locks.map((lock) => utils.computeScriptHash(lock).slice(0, 42));
      const responses = await client.batchRequest<RpcType.GetLiveCellsResult>(
        'get_cells',
        lockHashes.map((args) => [
          {
            script: {
              code_hash: chequeConfig.CODE_HASH,
              hash_type: chequeConfig.HASH_TYPE,
              args,
            },
            script_type: 'lock',
            search_type: 'prefix',
          },
          'asc',
          '0x64',
        ]),
      );
      const chequeBook: ChequeBook = {};
      console.log('fetch cheque responses', responses);
      responses.map((response, index) => {
        const cheques = response.objects.map(toCell);
        const lock = locks[index];
        const lockHash = lockHashes[index];
        chequeBook[lockHash] = { lock, cheques };
      });
      setChequeBook(chequeBook);
    };

    fetchCheques();
  }, []);

  return (
    <Box>
      {Object.values(chequeBook).map((chequeBookItem, itemIndex) => {
        return chequeBookItem.cheques.map((cheque, index) => {
          return <ClaimCellCard cheque={cheque} key={`${itemIndex}-${index}`} receiverLock={chequeBookItem.lock} />;
        });
      })}
    </Box>
  );
}
