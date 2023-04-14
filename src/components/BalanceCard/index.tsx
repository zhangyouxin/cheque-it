import * as React from 'react';
import { Box, Button, ButtonGroup, Card, CardBody, CardFooter, Divider, Heading, Stack, Text } from '@chakra-ui/react';
import { BI } from '@ckb-lumos/bi';
import { CreateCheque } from '../CreateCheque';
import { NModal } from '../NModal';
import { Cell, Script } from '@ckb-lumos/base';
import { formatDisplayCapacity } from '../../utils/utils';
import { AddressBook } from '../AddressBook';

export function BalanceCard(prop: { cells: Cell[]; locks: Script[] }) {
  const balanceCells = prop.cells.filter((cell) => !cell.cellOutput.type && cell.data === '0x');
  const balanceCapacity = balanceCells.reduce((acc, cell) => acc.add(cell.cellOutput.capacity), BI.from(0));
  return (
    <Card maxW="sm">
      <CardBody>
        <Stack spacing="3">
          <Text color="gray.600" fontSize="2xl">
            CKB Balance
          </Text>
          <Text color="teal.600" fontSize="2xl" fontWeight="bold">
            {formatDisplayCapacity(balanceCapacity)}
          </Text>
        </Stack>
      </CardBody>
      <CardFooter>
        <ButtonGroup spacing="2">
          <NModal title="Choose An Address" buttonText="Receive" buttonType="solid" size="sm">
            <AddressBook cells={prop.cells} locks={prop.locks} />
          </NModal>
          <NModal title="Write a cheque" size="sm">
            <CreateCheque />
          </NModal>
        </ButtonGroup>
      </CardFooter>
    </Card>
  );
}
