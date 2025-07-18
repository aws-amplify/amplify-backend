import React from 'react';
import {
  Modal,
  Box,
  SpaceBetween,
  Button,
  Header,
} from '@cloudscape-design/components';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      onDismiss={onCancel}
      header={<Header>{title}</Header>}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onCancel}>
              {cancelButtonText}
            </Button>
            <Button variant="primary" onClick={onConfirm}>
              {confirmButtonText}
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      {message}
    </Modal>
  );
};

export default ConfirmationModal;
