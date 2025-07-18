import React, { useState } from 'react';
import {
  Modal,
  Box,
  SpaceBetween,
  Button,
  FormField,
  Input,
  Header,
  Checkbox,
  Select,
} from '@cloudscape-design/components';
import { DevToolsSandboxOptions } from '../../../shared/socket_types';

interface SandboxOptionsModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: (options: DevToolsSandboxOptions) => void;
}

/**
 * SandboxOptionsModal component allows users to configure sandbox settings
 *
 * NOTE: Type Handling
 * This component uses DevToolsSandboxOptions from shared/socket_types.ts which is
 * designed to be compatible with socket communication. The key differences from
 * the actual @aws-amplify/sandbox SandboxOptions type are:
 *
 * 1. Different property names (e.g., 'dirToWatch' here vs 'dir' in the actual SandboxOptions)
 * 2. The 'exclude' and 'logsFilter' are passed as strings rather than string arrays
 * 3. We cannot use ClientConfigFormat directly in the React app
 *
 * The conversion between these types happens in the socket_handlers.ts file
 * which processes these fields before passing them to the sandbox.
 */
const SandboxOptionsModal: React.FC<SandboxOptionsModalProps> = ({
  visible,
  onDismiss,
  onConfirm,
}) => {
  const [identifier, setIdentifier] = useState<string>('');
  const [dirToWatch, setDirToWatch] = useState<string>('./amplify');
  const [excludeInput, setExcludeInput] = useState<string>('');
  const [outputsFormat, setOutputsFormat] = useState<string>('');
  const [once, setOnce] = useState<boolean>(false);
  const [streamFunctionLogs, setStreamFunctionLogs] = useState<boolean>(false);
  const [logsFilterInput, setLogsFilterInput] = useState<string>('');
  const [logsOutFile, setLogsOutFile] = useState<string>('');

  const handleConfirm = () => {
    const options: DevToolsSandboxOptions = {};

    if (identifier.trim()) {
      options.identifier = identifier.trim();
    }

    if (dirToWatch.trim() && dirToWatch !== './amplify') {
      options.dirToWatch = dirToWatch.trim();
    }

    if (excludeInput.trim()) {
      options.exclude = excludeInput.trim();
    }

    if (outputsFormat) {
      options.outputsFormat = outputsFormat;
    }

    if (once) {
      options.once = true;
    }

    if (streamFunctionLogs) {
      options.streamFunctionLogs = true;

      if (logsFilterInput.trim()) {
        options.logsFilter = logsFilterInput.trim();
      }

      if (logsOutFile.trim()) {
        options.logsOutFile = logsOutFile.trim();
      }
    }

    onConfirm(options);
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      header={<Header>Sandbox Options</Header>}
      size="large"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirm}>
              Start Sandbox
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="l">
        <FormField
          label="Sandbox Identifier"
          description="A unique identifier for the sandbox (1-15 characters, alphanumeric and hyphens only)"
          controlId="sandbox-identifier"
        >
          <Input
            value={identifier}
            onChange={({ detail }) => setIdentifier(detail.value)}
            placeholder="e.g., my-sandbox"
          />
        </FormField>

        <FormField
          label="Directory to Watch"
          description="Directory to watch for file changes (defaults to ./amplify)"
          controlId="dir-to-watch"
        >
          <Input
            value={dirToWatch}
            onChange={({ detail }) => setDirToWatch(detail.value)}
            placeholder="./amplify"
          />
        </FormField>

        <FormField
          label="Exclude Paths"
          description="Comma-separated list of paths or glob patterns to ignore"
          controlId = "exclude-paths"
        >
          <Input
            value={excludeInput}
            onChange={({ detail }) => setExcludeInput(detail.value)}
            placeholder="e.g., node_modules,dist"
          />
        </FormField>

        <FormField
          label="Outputs Format"
          description="amplify_outputs file format"
          controlId = "outputs-format"
        >
          <Select
            selectedOption={
              outputsFormat
                ? { label: outputsFormat, value: outputsFormat }
                : null
            }
            onChange={({ detail }) =>
              setOutputsFormat(detail.selectedOption?.value || '')
            }
            options={[
              { label: 'Default', value: undefined },
              { label: 'JSON', value: 'json' },
              { label: 'JSON Mobile', value: 'json-mobile' },
              { label: 'TypeScript', value: 'ts' },
              { label: 'DART', value: 'dart' },
              { label: 'MJS', value: 'mjs' },
            ]}
            placeholder="Select format"
          />
        </FormField>

        <FormField label="Deployment Options">
          <Checkbox
            checked={once}
            onChange={({ detail }) => setOnce(detail.checked)}
            disabled={streamFunctionLogs}
          >
            Execute a single deployment without watching for changes
          </Checkbox>
        </FormField>

        <FormField label="Function Logs">
          <Checkbox
            checked={streamFunctionLogs}
            onChange={({ detail }) => setStreamFunctionLogs(detail.checked)}
            disabled={once}
          >
            Stream function execution logs
          </Checkbox>
        </FormField>

        {streamFunctionLogs && (
          <>
            <FormField
              label="Logs Filter"
              description="Comma-separated regex patterns to filter logs from matched functions"
              controlId = "logs-filter"
            >
              <Input
                value={logsFilterInput}
                onChange={({ detail }) => setLogsFilterInput(detail.value)}
                placeholder="e.g., auth,api"
              />
            </FormField>

            <FormField
              label="Logs Output File"
              description="File to append the streaming logs"
            >
              <Input
                value={logsOutFile}
                onChange={({ detail }) => setLogsOutFile(detail.value)}
                placeholder="e.g., ./logs/function-logs.txt"
              />
            </FormField>
          </>
        )}
      </SpaceBetween>
    </Modal>
  );
};

export default SandboxOptionsModal;
