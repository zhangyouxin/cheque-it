import * as React from 'react';
import { Box, Badge, Button, Tooltip, useToast } from '@chakra-ui/react';
import { Script, utils } from '@ckb-lumos/base';
import { Uint128LE } from '@ckb-lumos/codec/lib/number';
import { formatDisplayAddress, formatDisplaySUDTAmount } from '../../utils/utils';
import { buildClaimTx } from './claimTxBuilder';
import { completeTx, sendTx } from '../../utils/txUtils';
import { useNetwork } from '../../hooks/useNetwork';
import { ResolvableCell } from '../../commons/types';
import { getAllLiveCells } from '../../commons/nexusTools';
import { getSenderLock } from './claimHelpers';
import { useTokenList } from '../../hooks/useTokenList';
import { encodeToAddress } from '@ckb-lumos/helpers';
import { CopyIcon } from '@chakra-ui/icons';
import CopyToClipboard from 'react-copy-to-clipboard';

export function ClaimCellCard(prop: { cheque: ResolvableCell; receiverLock: Script }) {
  if (!prop.cheque.data || prop.cheque.data === '0x') {
    throw new Error('Cell data is empty');
  }
  const { blockchainConfig, networkConfig } = useNetwork();
  const receiverAddress = encodeToAddress(prop.receiverLock, { config: blockchainConfig });
  const sUDTAmount = Uint128LE.unpack(prop.cheque.data);
  const handleClaim = async () => {
    const collectedCells = await getAllLiveCells(window.ckb);
    const senderLock = await getSenderLock(prop.cheque, networkConfig);
    const { tx, txSkeleton, chequeSignMessage } = buildClaimTx({
      blockchainConfig,
      networkConfig,
      cheque: prop.cheque,
      receiverLock: prop.receiverLock,
      senderLock: senderLock,
      collectedCells: collectedCells,
    });

    console.log('cheque tx hash', prop.cheque.outPoint.txHash);
    console.log('cheque args receiver:', prop.cheque.cellOutput.lock.args.slice(0, 42));
    console.log('cheque args sender:', prop.cheque.cellOutput.lock.args.slice(42, 82));
    console.log('sender lock', senderLock, utils.computeScriptHash(senderLock).slice(0, 42));
    console.log('receiver lock', prop.receiverLock, utils.computeScriptHash(prop.receiverLock).slice(0, 42));

    // 0xba699dae32352b65b690c23ae516b32110aa6e7781287dacf9fe24cbe0c84ccc
    // 0xaffe1a316203181032d012e127469015770df9c7921daa9dc56a295f3aa1cbee37c2bbcb7b91062354f0613c550f2f4b2d4ee2d3ef0f04f1ac012542a1551b1d00
    const signatures = await window.ckb.request({ method: 'wallet_fullOwnership_signTransaction', params: { tx } });
    const chequeSignature = await window.ckb.request({
      method: 'wallet_fullOwnership_signData',
      params: { data: chequeSignMessage, lock: prop.receiverLock },
    });
    console.log('signatures', signatures);
    console.log('chequeSignMessage', chequeSignMessage);
    console.log('chequeSignature', chequeSignature);
    const completedTx = completeTx({ signatures, txSkeleton, chequeSignature });
    // const completedTx = completeTx({ signatures, txSkeleton });
    console.log('completedTx', completedTx);
    const txHash = await sendTx({ tx: completedTx, networkConfig });
    console.log('txHash', txHash);
  };

  const { tokenList } = useTokenList();
  const token = tokenList.find((token) => token.lockArgs === prop.cheque.cellOutput.type?.args);

  const toast = useToast();
  function handleAddressClick(): void {
    toast({
      title: 'Copied.',
      status: 'success',
      duration: 1000,
    });
  }
  return (
    <Box maxW="lg" borderWidth="1px" borderRadius="lg" overflow="hidden" margin="1rem">
      <Box p="6">
        <Box display="flex" alignItems="baseline">
          <Badge borderRadius="full" px="2" colorScheme="teal">
            Eligable to Claim
          </Badge>
        </Box>

        <Box my="1" lineHeight="tight" fontSize={14}>
          Receiver Address:{' '}
          {
            <>
              <Tooltip label={receiverAddress}>{formatDisplayAddress(receiverAddress)}</Tooltip>
              <CopyToClipboard
                text={receiverAddress}
                onCopy={() => {
                  handleAddressClick();
                }}
              >
                <CopyIcon cursor="pointer" marginLeft={2} />
              </CopyToClipboard>
            </>
          }
        </Box>

        <Box mt="2" fontWeight="semibold" lineHeight="tall" fontSize={20}>
          {token?.symbol || 'Unknown Token'}: {formatDisplaySUDTAmount(sUDTAmount)}
        </Box>

        <Button size="sm" onClick={handleClaim}>
          Claim
        </Button>
      </Box>
    </Box>
  );
}
