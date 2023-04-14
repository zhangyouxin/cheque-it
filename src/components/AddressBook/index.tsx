import * as React from 'react';
import { Table, TableContainer, Tbody, Td, Th, Thead, Tr, Tooltip, useToast, Box } from '@chakra-ui/react';
import { CopyIcon } from '@chakra-ui/icons';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Cell, Script } from '@ckb-lumos/base';
import { useNetwork } from '../../hooks/useNetwork';
import { encodeToAddress } from '@ckb-lumos/helpers';
import { cellListCapacity, formatDisplayAddress, formatDisplayCapacity, scriptEqual } from '../../utils/utils';
import { DEFAULT_PAGE_SIZE } from '../../commons/consts';
import { Pagination } from '../Pagination';

interface AddressBookProp {
  locks: Script[];
  cells: Cell[];
}
interface TableItemProp {
  address: string;
  balance: string;
}
export function AddressBook(prop: AddressBookProp) {
  const { blockchainConfig } = useNetwork();
  const [pageIndex, setPageIndex] = React.useState(0);
  const { locks, cells } = prop;
  const tableItems = locks.map((lock: Script): TableItemProp => {
    const address = encodeToAddress(lock, { config: blockchainConfig });
    const addressCells = cells.filter((cell) => scriptEqual(cell.cellOutput.lock, lock));
    const addressBalance = cellListCapacity(addressCells);
    return {
      address,
      balance: formatDisplayCapacity(addressBalance),
    };
  });
  const toast = useToast();
  function handleAddressClick(): void {
    toast({
      title: 'Copied.',
      status: 'success',
      duration: 1000,
    });
  }
  const currentPageItems = tableItems.slice(pageIndex * DEFAULT_PAGE_SIZE, (pageIndex + 1) * DEFAULT_PAGE_SIZE);

  return (
    <TableContainer>
      <Table variant="striped" colorScheme="teal">
        <Thead>
          <Tr>
            <Th>Address</Th>
            <Th>Balance</Th>
          </Tr>
        </Thead>
        <Tbody>
          {currentPageItems.map((item) => (
            <Tr key={item.address}>
              <Td>
                <Tooltip label={item.address}>{formatDisplayAddress(item.address)}</Tooltip>
                <CopyToClipboard
                  text={item.address}
                  onCopy={() => {
                    handleAddressClick();
                  }}
                >
                  <CopyIcon cursor="pointer" marginLeft={2} />
                </CopyToClipboard>
              </Td>
              <Td>{item.balance} CKB</Td>
            </Tr>
          ))}
          {currentPageItems.length <= DEFAULT_PAGE_SIZE &&
            new Array(DEFAULT_PAGE_SIZE - currentPageItems.length).fill(null).map((_, index) => (
              <Tr key={index}>
                <Td>{'-'}</Td>
                <Td>{'-'}</Td>
              </Tr>
            ))}
        </Tbody>
      </Table>
      <Box marginTop={4}>
        <Pagination pageIndex={pageIndex} setPageIndex={setPageIndex} totalCount={tableItems.length} />
      </Box>
    </TableContainer>
  );
}
