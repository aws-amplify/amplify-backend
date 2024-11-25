import { SerializableError } from './serializable_error';

export type UsageData = {
  sessionUuid: string;
  installationUuid: string;
  amplifyCliVersion: string;
  timestamp: string;
  error?: SerializableError | undefined;
  downstreamException?: SerializableError | undefined;
  payloadVersion: string;
  osPlatform: string;
  osRelease: string;
  nodeVersion: string;
  state: 'FAILED' | 'SUCCEEDED';
  isCi: boolean;
  accountId: string;
  input: { command: string; plugin: string };
  codePathDurations: { platformStartup?: number; totalDuration?: number };
  projectSetting: { editor?: string };
};
