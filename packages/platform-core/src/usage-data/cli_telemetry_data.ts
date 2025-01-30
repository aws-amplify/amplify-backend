import { Dependency } from '@aws-amplify/plugin-types';

// Core Identifiers
export type CoreIdentifiersDetails = {
  payloadVersion: string;
  sessionUuid: string;
  eventId: string;
  timestamp: string;
  localProjectId: string;
  accountId?: string;
  awsRegion?: string;
};

export type EventDetails = {
  state: 'ABORTED' | 'FAILED' | 'SUCCEEDED';
  command: {
    path: string[];
    parameters: string[];
  };
};

export type EnvironmentDetails = {
  os: {
    platform: string;
    release: string;
  };
  shell: string;
  npmUserAgent: string;
  ci: boolean;
  memory: {
    total: number;
    free: number;
  };
};

export type LatencyDetails = {
  total: number;
  init?: number;
  synthesis?: number;
  deployment?: number;
  hotSwap?: number;
};

export type ErrorDetails = {
  name: string;
  message: string;
  stack: string;
  cause?: ErrorDetails;
};

export type ProjectDetails = {
  dependencies?: Array<Dependency>;
};

// Main Telemetry Data Structure
export type AmplifyCliTelemetryData = {
  identifiers: CoreIdentifiersDetails;
  event: EventDetails;
  environment: EnvironmentDetails;
  project: ProjectDetails;
  latency: LatencyDetails;
  error?: ErrorDetails;
};
