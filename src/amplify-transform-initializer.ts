import { App } from "aws-cdk-lib";
import { Construct } from "constructs";
import { consoleLogger } from "./amplify-logger";
import { amplifyMetrics } from "./amplify-metrics";
import { AmplifyTransform } from "./amplify-transform";
import { hydrateTokens } from "./hydrate-tokens";
import { AmplifyManifest, TokenizedManifest, TransformKey } from "./manifest-types";
import { AmplifyResourceTransformFactory, AmplifyResourceTransform } from "./types";

import { getAmplifyResourceTransform as getStorageTransform } from "./amplify-storage";
import { getAmplifyResourceTransform as getFunctionTransform } from "./amplify-function";
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
export const getTransformForManifest = async (
  construct: Construct,
  envName: string,
  tokenizedManifest: TokenizedManifest
): Promise<AmplifyTransform> => {
  // TODO parse / validate manifest into DAO. This will remove the need for type assertions
  // manifest parameters will be loaded from our metadata service for the specified account/region/envName tuple
  const params: Record<string, string> = tokenizedManifest.parameters || {};

  // TODO will need more validation here to assert that manifest is correctly formed
  const hydratedManifest: AmplifyManifest = hydrateTokens<TokenizedManifest>(tokenizedManifest, params) as AmplifyManifest;

  // plainToClass(AmplifyManifestDAO, hydratedManifest);

  // this is a placeholder for what would be a fetch to npm / check local cache for the transformer defined in the manifest
  // each transformer package would export a factory function named "getAmplifyResourceTransform" which returns an instance of an AmplifyResourceTransform
  const remoteFetchPlaceholder: Record<string, AmplifyResourceTransformFactory> = {
    "@aws-amplify/s3-transform@1.2.3": getStorageTransform,
    "@aws-amplify/lambda-transform@2.3.4": getFunctionTransform,
  };

  const transformers: Record<TransformKey, AmplifyResourceTransform> = {};
  Object.entries(hydratedManifest.transformers).forEach(([transformerKey, transformerName]) => {
    // transformer factory is injected with everything it needs from the platform here
    transformers[transformerKey] = remoteFetchPlaceholder[transformerName](cdk, consoleLogger, amplifyMetrics);
  });

  return new AmplifyTransform(construct, envName, hydratedManifest.resources, transformers);
};
