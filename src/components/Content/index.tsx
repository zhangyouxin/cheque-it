import React from 'react';
import { Box } from '@chakra-ui/react';

interface Props {
  children: React.ReactNode;
}

export function Content({ children }: Props) {
  return (
    <Box h="calc(100vh - 60px)" bg="#f9fbfc" py="20px">
      <Box
        w={{ base: '90%', sm: '400px' }}
        boxShadow="0 6px 8px 0 #dfe7e3db"
        bg="#fff"
        m="auto"
        h="100%"
        border="1px solid"
        borderRadius="16px"
        borderColor="contentBorder"
      >
        {children}
      </Box>
    </Box>
  );
}
