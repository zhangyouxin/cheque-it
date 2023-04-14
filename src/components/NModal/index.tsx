import * as React from 'react';
import {
  Button,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
  Modal,
} from '@chakra-ui/react';

interface Props {
  title: string;
  children: React.ReactNode;

  buttonText?: string;
  buttonType?: 'solid' | 'outline' | 'ghost' | 'link' | 'unstyled';

  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
  save?: React.ReactNode;
}

export function NModal({ buttonText, title, children, size, buttonType, save }: Props) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <>
      <Button onClick={onOpen} variant={buttonType || 'outline'}>
        {buttonText || title}
      </Button>
      <Modal onClose={onClose} isOpen={isOpen} isCentered size={size || '4xl'}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{title}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>{children}</ModalBody>
          <ModalFooter display='flex'>
            
            <Button onClick={onClose}>Close</Button>
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
