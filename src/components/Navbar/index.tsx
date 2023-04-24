import React from 'react';
import { Box, Button, Divider, Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';
import { getOffChainLocks } from '../../commons/nexusTools';
import { useNetwork } from '../../hooks/useNetwork';
import { encodeToAddress } from '@ckb-lumos/helpers';
import { claimTTKN } from '../SUDTFaucet';

interface Props {
  nickName: string;
}

export function Navbar({ nickName }: Props) {
  const { blockchainConfig } = useNetwork();
  async function handleClaimSUDT(): Promise<void> {
    if (!window.ckb) return;
    const offChainLocks = await getOffChainLocks(window.ckb);
    const receiverLock = offChainLocks[0];
    const receiverAddress = encodeToAddress(receiverLock, { config: blockchainConfig });
    await claimTTKN({ receiverAddress });
  }

  return (
    <Box
      w="100%"
      h="60px"
      bg="gray.100"
      position="sticky"
      top={0}
      lineHeight="60px"
      textAlign="center"
      fontWeight="bold"
    >
      <Box display="flex" justifyContent="space-between" w="600px" m="auto">
        {nickName && `Hi ${nickName},`} Welcome to Cheque-it
        <Menu>
          {({ isOpen }) => (
            <>
              <MenuButton my="auto" isActive={isOpen} as={Button} leftIcon={<HamburgerIcon />}></MenuButton>
              <MenuList>
                <MenuItem onClick={handleClaimSUDT}>Claim 1000 Test Token</MenuItem>
              </MenuList>
            </>
          )}
        </Menu>
      </Box>
    </Box>
  );
}
