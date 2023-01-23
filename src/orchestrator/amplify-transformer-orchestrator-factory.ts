import { Construct } from "constructs";
import { consoleLogger } from "../observability-tooling/amplify-logger";
import { amplifyMetrics } from "../observability-tooling/amplify-metrics";
import { AmplifyTransformerOrchestrator } from "./amplify-transformer-orchestrator";
import { hydrateTokens } from "./hydrate-tokens";
import { AmplifyManifest, TokenizedManifest, ProviderKey } from "../manifest/manifest-types";
import { AmplifyInitializer, AmplifyServiceProviderFactory } from "../types";

import { init as initS3 } from "../providers/s3-provider/s3-provider";
import { init as initLambda } from "../providers/lambda/lambda-provider";
import { init as initAppSync } from "../providers/appsync/appsync-provider";
import { init as initDynamo } from "../providers/dynamodb/dynamodb-provider";
import * as cdk from "aws-cdk-lib";
/**
 * This should be a first class entry point into Amplify for customers who want to integrate an Amplify manifest into an existing CDK application
 *
 * It performs all the steps necessary to resolve / fetch values referenced in the manifest file and initializes the AmplifyTransform base CDK construct
 * AmplifyTransform.transform() can then be used to initiate orchestration of Amplify generated resources
 * @param construct The CDK construct that the AmplifyTransform will exist in
 * @param tokenizedManifest The raw manifest object that should be transformed
 * @returns Initialized AmplifyTransform instance
 */
export const createTransformerOrchestrator = async (
  construct: Construct,
  envName: string,
  tokenizedManifest: TokenizedManifest
): Promise<AmplifyTransformerOrchestrator> => {
  // TODO parse / validate manifest into DAO. This will remove the need for type assertions
  // manifest parameters will be loaded from our metadata service for the specified account/region/envName tuple
  const params: Record<string, string> = tokenizedManifest.parameters || {};

  // TODO will need more validation here to assert that manifest is correctly formed
  const hydratedManifest: AmplifyManifest = hydrateTokens<TokenizedManifest>(tokenizedManifest, params) as AmplifyManifest;

  // plainToClass(AmplifyManifestDAO, hydratedManifest);

  // this is a placeholder for what would be a fetch to npm / check local cache for the transformer defined in the manifest
  // each transformer package would export a factory function named "getAmplifyResourceTransform" which returns an instance of an AmplifyResourceTransform
  const remoteFetchPlaceholder: Record<string, AmplifyInitializer> = {
    "@aws-amplify/s3-provider@1.2.3": initS3,
    "@aws-amplify/lambda-provider@2.3.4": initLambda,
    "@aws-amplify/app-sync-provider@10.2.3": initAppSync,
    "@aws-amplify/dynamo-db-provider@1.2.3": initDynamo,
  };

  const transformers: Record<ProviderKey, AmplifyServiceProviderFactory> = {};
  Object.entries(hydratedManifest.transformers).forEach(([transformerKey, transformerName]) => {
    // transformer factory is injected with everything it needs from the platform here
    transformers[transformerKey] = remoteFetchPlaceholder[transformerName](cdk, consoleLogger, amplifyMetrics);
  });

  return new AmplifyTransformerOrchestrator(construct, envName, hydratedManifest.resources, transformers);
};
