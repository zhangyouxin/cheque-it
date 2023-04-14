import React from 'react';
import { Box, Container } from '@chakra-ui/react';
import { Navbar } from '../Navbar';
import { Content } from '../Content';

interface Props {
  children: React.ReactNode;
}

export function Layout({ children }: Props) {
  return (
    <Box w="100vw" m={0} p={0}>
      <Navbar nickName="dd" />
      <Content>{children}</Content>
    </Box>
  );
}
