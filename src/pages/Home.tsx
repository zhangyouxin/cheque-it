import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Box, Button, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react';
import { useNetwork } from '../hooks/useNetwork';
import { BI } from '@ckb-lumos/bi';
import { getAllLiveCells, getAllLocks, getOffChainLocks } from '../commons/nexusTools';
import { BalanceCard } from '../components/BalanceCard';
import { ClaimPanel } from '../components/ClaimPanel';
import { completeTx, sendTx } from '../utils/txUtils';
import { Cell, Script } from '@ckb-lumos/base';

export function Home() {
  const [nickName, setNickName] = useState<string>('');
  const [ckb, setCkb] = useState<typeof window.ckb>();
  const [cells, setCells] = useState<Cell[]>([]);
  const [locks, setLocks] = useState<Script[]>([]);

  async function handleConnect(): Promise<void> {
    const windowCKB = window.ckb;
    if (!windowCKB) {
      console.log('no nexus wallet found!');
      return;
    }
    const enableRes = await windowCKB.request({ method: 'wallet_enable', params: [] });
    setNickName(enableRes.nickname);
    setCkb(windowCKB);

    const cells = await getAllLiveCells(windowCKB);
    setCells(cells);
    const locks = await getAllLocks(windowCKB);
    setLocks(locks);
  }

  useEffect(() => {
    void handleConnect();
  }, []);

  return (
    <Layout>
      <Tabs isFitted variant="soft-rounded" colorScheme="gray">
        <Box px="10px" py="6px" border="1px solid" m="10px" borderRadius="24px" bg="info" borderColor="contentBorder">
          <TabList>
            <Tab>Deposit</Tab>
            <Tab>Claim</Tab>
          </TabList>
        </Box>
        <TabPanels>
          <TabPanel>
            <BalanceCard cells={cells} locks={locks} />
          </TabPanel>
          <TabPanel>
            <ClaimPanel ckb={ckb} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Layout>
  );
}
