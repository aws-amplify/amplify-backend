import {
  AmplifyBackendPlatform,
  OutputStorageStrategy,
} from '@aws-amplify/plugin-types';

/**
 * Implementation of AmplifyBackendPlatform for CDK backends.
 */
export class AmplifyBackendCDKPlatform implements AmplifyBackendPlatform {
  /**
   * Initialize the platform with other platform context
   */
  constructor(readonly outputStorageStrategy: OutputStorageStrategy) {}
}
