// Core Identifiers
export type CoreIdentifiersDetails = {
  sessionUuid: string;
  eventId: string;
  timestamp: string;
  localProjectId: string;
  accountId?: string;
  payloadVersion: string;
  awsRegion: string;
};

// Command Details
export type EventDetails = {
  success: boolean;
  command: {
    path: string[];
    parameters: string[];
  };
};

// Environment Details
export type EnvironmentDetails = {
  osRelease: string;
  shell: string;
  npmUserAgent: string;
  ci: boolean;
  memory: {
    total: number;
    free: number;
  };
};

// Latency (Optional)
export type LatencyDetails = {
  init?: number;
  synthesis?: number;
  deployment?: number;
  hotSwap?: number;
  total: number;
};

// Error Details (Optional)
export type ErrorDetails = {
  name: string;
  message: string;
  stack: string;
  cause?: ErrorDetails;
};

// Project Details
export type ProjectDetails = {
  dependencies: Array<{ name: string; version: string }>;
};

// Main Telemetry Data Structure
export type AmplifyCliTelemetryData = {
  identifiers: CoreIdentifiersDetails;
  event: EventDetails;
  environment: EnvironmentDetails;
  project: ProjectDetails;
  latency?: LatencyDetails;
  error?: ErrorDetails;
};
