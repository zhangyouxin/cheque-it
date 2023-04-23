import * as React from 'react';
import { Box, Radio, Stack, RadioGroup, Button, Input, FormControl, FormLabel, Select } from '@chakra-ui/react';
import { isEmpty } from 'lodash';
import { BI } from '@ckb-lumos/bi';
import { buildDepositTx } from './depositTxBuilder';
import { getAllLiveCells, getOffChainLocks } from '../../commons/nexusTools';
import { completeTx, sendTx } from '../../utils/txUtils';
import { useNetwork } from '../../hooks/useNetwork';
import { parseAddress } from '@ckb-lumos/helpers';

export function CreateCheque() {
  const { blockchainConfig, networkConfig } = useNetwork();
  const [receirverAddress, setReceiverAddress] = React.useState('');
  const [sudtAmount, setSudtAmount] = React.useState('');
  const [sudtArgs, setSudtArgs] = React.useState('');
  const handleCreateCheque = async () => {
    const receiverInfo = parseAddress(receirverAddress, { config: blockchainConfig });
    const cells = await getAllLiveCells(window.ckb);
    const locks = await getOffChainLocks(window.ckb);
    console.log('cells', cells);
    console.log('locks', locks);
    console.log('receiverInfo', receiverInfo);
    console.log('sudtArgs', sudtArgs);
    console.log('sudtAmount', sudtAmount);
    
    const senderInfo = locks[0];

    const { tx, txSkeleton } = buildDepositTx({
      blockchainConfig,
      networkConfig,
      sudtTypeInfo: sudtArgs,
      sudtAmount: BI.from(Number(sudtAmount) * 1e8).mul(1e10),
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

  return (
    <Box>
      <FormControl>
        <FormLabel>Choose SUDT:</FormLabel>
        <Select placeholder="Select SUDT" onChange={(e) => setSudtArgs(e.target.value)}>
          <option value="0x58bef38794236b315b7c23fd8132d7f42676228d659b291936e8c6c7ba9f064e">TTKN</option>
        </Select>
        <FormLabel>SUDT Amount:</FormLabel>
        <Input
          type="text"
          value={sudtAmount}
          onChange={(e) => setSudtAmount(e.target.value)}
          marginBottom={2}
        />
        <FormLabel>Receiver Address:</FormLabel>
        <Input
          type="text"
          value={receirverAddress}
          onChange={(e) => setReceiverAddress(e.target.value)}
          marginBottom={2}
        />
      </FormControl>
      <Button onClick={handleCreateCheque}> create default cheque </Button>
    </Box>
  );
}
