import { Construct } from 'constructs';
import {
  ConstructCache,
  ConstructCacheEntryGenerator,
  ConstructFactory,
} from '@aws-amplify/plugin-types';
import {
  AmplifyStorage,
  AmplifyStorageProps,
} from '@aws-amplify/storage-construct';

/**
 * Singleton factory for a Storage bucket that can be used in `storage.ts` files
 */
export class AmplifyStorageFactory implements ConstructFactory<AmplifyStorage> {
  private readonly generator: ConstructCacheEntryGenerator;

  /**
   * Set the properties that will be used to initialize the bucket
   */
  constructor(private readonly props: AmplifyStorageProps) {
    this.generator = new AmplifyStorageGenerator(props);
  }

  /**
   * Get a singleton instance of the Bucket
   */
  getInstance(cache: ConstructCache): AmplifyStorage {
    return cache.getOrCompute(this.generator) as AmplifyStorage;
  }
}

class AmplifyStorageGenerator implements ConstructCacheEntryGenerator {
  readonly resourceGroupName = 'storage';
  private readonly defaultName = 'amplifyStorage';

  constructor(private readonly props: AmplifyStorageProps) {}

  generateCacheEntry(scope: Construct) {
    return new AmplifyStorage(scope, this.defaultName, this.props);
  }
}

/**
 * Alias for AmplifyStorageFactory
 */
export const Storage = AmplifyStorageFactory;
