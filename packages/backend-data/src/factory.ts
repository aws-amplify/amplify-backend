import { Construct } from 'constructs';
import {
  BackendOutputStorageStrategy,
  ConstructCache,
  ConstructCacheEntryGenerator,
  ConstructFactory,
} from '@aws-amplify/plugin-types';
import { aws_appsync } from 'aws-cdk-lib';

export type DataPropsPlaceholder = {
  param: string;
};
/**
 * Hello world construct implementation
 */
export class DataFactory implements ConstructFactory<Construct> {
  private generator: ConstructCacheEntryGenerator;
  /**
   * Create a new AmplifyConstruct
   */
  constructor(private readonly props: DataPropsPlaceholder) {}

  /**
   * TODO
   */
  getInstance(
    cache: ConstructCache,
    outputStorageStrategy: BackendOutputStorageStrategy
  ): Construct {
    if (!this.generator) {
      this.generator = new DataGenerator(this.props, outputStorageStrategy);
    }
    return cache.getOrCompute(this.generator);
  }
}

class DataGenerator implements ConstructCacheEntryGenerator {
  readonly resourceGroupName: 'data';
  private readonly defaultName = 'amplifyData';

  constructor(
    private readonly props: DataPropsPlaceholder,
    private readonly backendOutputStorageStrategy: BackendOutputStorageStrategy
  ) {}

  generateCacheEntry(scope: Construct) {
    const dataConstruct = new aws_appsync.GraphqlApi(
      scope,
      this.defaultName,
      {}
    );
    dataConstruct.storeOutput(this.backendOutputStorageStrategy);
    return dataConstruct;
  }
}
