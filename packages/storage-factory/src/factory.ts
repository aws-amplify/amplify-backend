import { Construct } from 'constructs';
import {
  ConstructCache,
  ConstructCacheEntryGenerator,
  ConstructFactory,
  BackendOutputStorageStrategy,
} from '@aws-amplify/plugin-types';
import {
  AmplifyStorage,
  AmplifyStorageProps,
} from '@aws-amplify/storage-construct';

/**
 * Singleton factory for a Storage bucket that can be used in `storage.ts` files
 */
export class AmplifyStorageFactory implements ConstructFactory<AmplifyStorage> {
  private generator: ConstructCacheEntryGenerator;

  /**
   * Set the properties that will be used to initialize the bucket
   */
  constructor(private readonly props: AmplifyStorageProps) {}

  /**
   * Get a singleton instance of the Bucket
   */
  getInstance(
    cache: ConstructCache,
    outputStorageStrategy: BackendOutputStorageStrategy
  ): AmplifyStorage {
    if (!this.generator) {
      this.generator = new AmplifyStorageGenerator(
        this.props,
        outputStorageStrategy
      );
    }
    return cache.getOrCompute(this.generator) as AmplifyStorage;
  }
}

class AmplifyStorageGenerator implements ConstructCacheEntryGenerator {
  readonly resourceGroupName = 'storage';
  private readonly defaultName = 'amplifyStorage';

  constructor(
    private readonly props: AmplifyStorageProps,
    private readonly outputStorageStrategy: BackendOutputStorageStrategy
  ) {}

  generateCacheEntry(scope: Construct) {
    const storageConstruct = new AmplifyStorage(
      scope,
      this.defaultName,
      this.props
    );
    storageConstruct.storeOutput(this.outputStorageStrategy);
    return storageConstruct;
  }
}

/**
 * Alias for AmplifyStorageFactory
 */
export const Storage = AmplifyStorageFactory;
