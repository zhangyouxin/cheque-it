import * as React from 'react';
import { Box, Radio, Stack, RadioGroup } from '@chakra-ui/react';
import { isEmpty } from 'lodash';
import { BI } from '@ckb-lumos/bi';
import { buildDepositTx } from './depositTxBuilder';
import { getAllLiveCells, getOffChainLocks } from '../../commons/nexusTools';
import { completeTx, sendTx } from '../../utils/txUtils';
import { useNetwork } from '../../hooks/useNetwork';

export function CreateCheque() {
  const { blockchainConfig, networkConfig } = useNetwork();
  const handleCreateCheque = async () => {
    const cells = await getAllLiveCells(window.ckb);
    const locks = await getOffChainLocks(window.ckb);
    console.log('cells', cells);
    console.log('locks', locks);
    const senderInfo = locks[0];
    const receiverInfo = { ...locks[1], args: '0x7e5214b07ed80b201df4ff00e27611a57f3ad5ae' };

    const { tx, txSkeleton } = buildDepositTx({
      blockchainConfig,
      networkConfig,
      sudtTypeInfo: '0x58bef38794236b315b7c23fd8132d7f42676228d659b291936e8c6c7ba9f064e',
      sudtAmount: BI.from(4).mul(1e18),
      senderInfo: senderInfo,
      receiverInfo: receiverInfo,
      collectedCells: cells,
      changeLock: senderInfo,
    });

    const signatures = await window.ckb.request({ method: 'wallet_fullOwnership_signTransaction', params: { tx } });
    console.log('signatures', signatures);
    const completedTx = completeTx({ signatures, txSkeleton });
    console.log('completedTx', completedTx);
    const txHash = await sendTx({ tx: completedTx, networkConfig });
    console.log('txHash', txHash);
  };

  return <Box>CreateCheque</Box>;
}
