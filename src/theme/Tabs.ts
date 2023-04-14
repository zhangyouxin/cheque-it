import { createMultiStyleConfigHelpers } from '@chakra-ui/react';
const { definePartsStyle, defineMultiStyleConfig } = createMultiStyleConfigHelpers(['tab']);

export const Tabs = defineMultiStyleConfig({
  baseStyle: {
    tab: {},
  },
  sizes: {},
  variants: {},
  defaultProps: {},
});
