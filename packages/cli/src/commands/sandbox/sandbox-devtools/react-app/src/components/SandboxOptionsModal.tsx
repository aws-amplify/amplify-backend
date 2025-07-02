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
  ColumnLayout,
} from '@cloudscape-design/components';

interface SandboxOptionsModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: (options: SandboxOptions) => void;
}

export interface SandboxOptions {
  profile?: string;
  identifier?: string;
  dirToWatch?: string;
  exclude?: string[];
  outputsFormat?: string;
  outputsOutDir?: string;
  outputsVersion?: string;
  once?: boolean;
  streamFunctionLogs?: boolean;
  logsFilter?: string[];
  logsOutFile?: string;
}

const SandboxOptionsModal: React.FC<SandboxOptionsModalProps> = ({
  visible,
  onDismiss,
  onConfirm,
}) => {
  const [profile, setProfile] = useState<string>('');
  const [identifier, setIdentifier] = useState<string>('');
  const [dirToWatch, setDirToWatch] = useState<string>('./amplify');
  const [excludeInput, setExcludeInput] = useState<string>('');
  const [outputsFormat, setOutputsFormat] = useState<string>('');
  const [outputsOutDir, setOutputsOutDir] = useState<string>('');
  const [outputsVersion, setOutputsVersion] = useState<string>('');
  const [once, setOnce] = useState<boolean>(false);
  const [streamFunctionLogs, setStreamFunctionLogs] = useState<boolean>(false);
  const [logsFilterInput, setLogsFilterInput] = useState<string>('');
  const [logsOutFile, setLogsOutFile] = useState<string>('');

  const handleConfirm = () => {
    const options: SandboxOptions = {};

    if (profile.trim()) {
      options.profile = profile.trim();
    }

    if (identifier.trim()) {
      options.identifier = identifier.trim();
    }

    if (dirToWatch.trim() && dirToWatch !== './amplify') {
      options.dirToWatch = dirToWatch.trim();
    }

    if (excludeInput.trim()) {
      options.exclude = excludeInput.split(',').map((item) => item.trim());
    }

    if (outputsFormat) {
      options.outputsFormat = outputsFormat;
    }

    if (outputsOutDir.trim()) {
      options.outputsOutDir = outputsOutDir.trim();
    }

    if (outputsVersion) {
      options.outputsVersion = outputsVersion;
    }

    if (once) {
      options.once = true;
    }

    if (streamFunctionLogs) {
      options.streamFunctionLogs = true;

      if (logsFilterInput.trim()) {
        options.logsFilter = logsFilterInput
          .split(',')
          .map((item) => item.trim());
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
        <ColumnLayout columns={2}>
          <FormField
            label="AWS Profile"
            description="The AWS profile to use for the sandbox"
          >
            <Input
              value={profile}
              onChange={({ detail }) => setProfile(detail.value)}
              placeholder="e.g., personal"
            />
          </FormField>

          <FormField
            label="Sandbox Identifier"
            description="A unique identifier for the sandbox (1-15 characters, alphanumeric and hyphens only)"
          >
            <Input
              value={identifier}
              onChange={({ detail }) => setIdentifier(detail.value)}
              placeholder="e.g., my-sandbox"
            />
          </FormField>
        </ColumnLayout>

        <FormField
          label="Directory to Watch"
          description="Directory to watch for file changes (defaults to ./amplify)"
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
        >
          <Input
            value={excludeInput}
            onChange={({ detail }) => setExcludeInput(detail.value)}
            placeholder="e.g., node_modules,dist"
          />
        </FormField>

        <ColumnLayout columns={2}>
          <FormField
            label="Outputs Format"
            description="amplify_outputs file format"
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
                { label: 'Default', value: '' },
                { label: 'JSON', value: 'json' },
                { label: 'TypeScript', value: 'typescript' },
              ]}
              placeholder="Select format"
            />
          </FormField>

          <FormField
            label="Outputs Version"
            description="Version of the configuration"
          >
            <Select
              selectedOption={
                outputsVersion
                  ? { label: outputsVersion, value: outputsVersion }
                  : null
              }
              onChange={({ detail }) =>
                setOutputsVersion(detail.selectedOption?.value || '')
              }
              options={[
                { label: 'Default', value: '' },
                { label: 'v0', value: '0' },
                { label: 'v1', value: '1' },
              ]}
              placeholder="Select version"
            />
          </FormField>
        </ColumnLayout>

        <FormField
          label="Outputs Directory"
          description="Directory where amplify_outputs is written"
        >
          <Input
            value={outputsOutDir}
            onChange={({ detail }) => setOutputsOutDir(detail.value)}
            placeholder="e.g., ./src"
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
