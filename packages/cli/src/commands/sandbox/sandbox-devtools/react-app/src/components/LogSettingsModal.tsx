import React, { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  SpaceBetween,
  Button,
  FormField,
  Header,
  Slider,
} from '@cloudscape-design/components';

interface LogSettingsModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (settings: LogSettings) => void;
  onClear: () => void;
  initialSettings: LogSettings;
  currentSizeMB?: number;
}

export interface LogSettings {
  maxLogSizeMB: number;
}

const LogSettingsModal: React.FC<LogSettingsModalProps> = ({
  visible,
  onDismiss,
  onSave,
  onClear,
  initialSettings,
  currentSizeMB,
}) => {
  const [maxLogSizeMB, setMaxLogSizeMB] = useState<number>(
    initialSettings.maxLogSizeMB,
  );

  // Update state when initialSettings change
  useEffect(() => {
    setMaxLogSizeMB(initialSettings.maxLogSizeMB);
  }, [initialSettings]);

  const handleSave = () => {
    onSave({ maxLogSizeMB });
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      header={<Header>Log Settings</Header>}
      size="medium"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Save Settings
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="l">
        {currentSizeMB !== undefined && (
          <Box>
            Current log size: <strong>{currentSizeMB.toFixed(2)} MB</strong>
          </Box>
        )}

        <FormField
          label={`Maximum Log Size (${maxLogSizeMB} MB)`}
          description="Set the maximum size for all logs combined. Older logs will be removed when this limit is reached."
        >
          <Slider
            value={maxLogSizeMB}
            onChange={({ detail }) => setMaxLogSizeMB(detail.value)}
            min={10}
            max={500}
            step={10}
          />
        </FormField>
        <Button onClick={onClear} iconName="remove">
          Clear Logs
        </Button>
      </SpaceBetween>
    </Modal>
  );
};

export default LogSettingsModal;
