import { OutputStorageStrategy } from './output_storage_stragegy.js';

/**
 * Functional interface for constructs that provide Amplify output
 */
export type AmplifyOutputSetter = {
  setAmplifyOutput(outputStorageStrategy: OutputStorageStrategy): void;
};
