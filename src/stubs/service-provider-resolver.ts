import { AmplifyCdkType, AmplifyInitializer, AmplifyServiceProviderFactory, AmplifyZodType, IAmplifyLogger, IAmplifyMetrics } from '../types';

import { init as initS3 } from '../providers/s3-provider/s3-provider';
import { init as initLambda } from '../providers/lambda/lambda-provider';
import { init as initAppSync } from '../providers/appsync/appsync-provider';
import { init as initDynamo } from '../providers/dynamodb/dynamodb-provider';
import { ProviderRecord, ProviderToken } from '../manifest/manifest-schema';

/**
 * This class is a stub of whatever logic we will have to fetch / install / load AmplifyServiceProviders dynamically based on the definition in the manifest file
 */
export class ServiceProviderResolver {
  constructor(
    private readonly cdkInstance: AmplifyCdkType,
    private readonly logger: IAmplifyLogger,
    private readonly metrics: IAmplifyMetrics,
    private readonly az: AmplifyZodType
  ) {}
  private readonly stubProviderResolver: Record<string, AmplifyInitializer> = {
    '@aws-amplify/s3-provider@1.2.3': initS3,
    '@aws-amplify/lambda-provider@4.5.6': initLambda,
    '@aws-amplify/app-sync-provider@10.2.3': initAppSync,
    '@aws-amplify/dynamo-db-provider@2.3.4': initDynamo,
  };
  async loadProviders(requiredProviders: ProviderRecord): Promise<Record<ProviderToken, AmplifyServiceProviderFactory>> {
    const result: Record<ProviderToken, AmplifyServiceProviderFactory> = {};

    Object.entries(requiredProviders).forEach(([providerKey, providerToken]) => {
      // this simulates a provider not being found on npm
      if (!this.stubProviderResolver[providerToken]) {
        throw new Error(`Could not find AmplifyServiceProvider that satisfies ${providerToken}`);
      }
      result[providerKey] = this.stubProviderResolver[providerToken](this.cdkInstance, this.logger, this.metrics, this.az);
    });

    return result;
  }
}
