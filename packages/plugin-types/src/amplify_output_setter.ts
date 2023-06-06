import { OutputStorageStrategy } from './output_storage_stragegy.js';

export type AmplifyOutputSetter = {
  setAmplifyOutput(outputStorageStrategy: OutputStorageStrategy): void;
};
