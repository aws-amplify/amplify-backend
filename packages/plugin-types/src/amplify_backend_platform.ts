import { OutputStorageStrategy } from './output_storage_stragegy.js';

/**
 * Platform abstractions that are passed to Amplify constructs
 */
export type AmplifyBackendPlatform = {
  outputStorageStrategy: Readonly<OutputStorageStrategy>;
};
