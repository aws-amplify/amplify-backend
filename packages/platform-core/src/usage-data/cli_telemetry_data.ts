// Core Identifiers
export type CoreIdentifiersDetails = {
  sessionUuid: string;
  timestamp: string;
  localProjectId: string;
  accountId?: string;
  payloadVersion: string;
  awsRegion: string;
};

// Command Details
export type CommandDetails = {
  success: boolean;
  command: {
    path: string[];
    parameters: string[];
  };
  executionTime: number;
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
export type Latency = {
  init?: number;
  synthesis?: number;
  deployment?: number;
  hotSwap?: number;
};

// Error Details (Optional)
export type ErrorDetails = {
  primary: {
    name: string;
    message: string;
  };
  cause?: Array<{
    name: string;
    message: string;
    methodName: string;
    file: string;
    lineNumber: number;
    columnNumber: string;
  }>;
};

// Project Details
export type ProjectDetails = {
  dependencies: Array<{ name: string; version: string }>;
};

// Main Telemetry Data Structure
export type AmplifyCliTelemetryData = {
  identifiers: CoreIdentifiersDetails;
  command: CommandDetails;
  environment: EnvironmentDetails;
  project: ProjectDetails;
  latency?: Latency;
  error?: ErrorDetails;
};
