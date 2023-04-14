import React from 'react';
import { Box, Divider } from '@chakra-ui/react';

interface Props {
  nickName: string;
}

export function Navbar({ nickName }: Props) {
  return (
    <Box w="100%" h="60px" bg="gray.100" position="sticky" top={0}>
      {nickName}
    </Box>
  );
}
