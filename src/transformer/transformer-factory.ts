import { consoleLogger } from '../observability-tooling/amplify-logger';
import { amplifyMetrics } from '../observability-tooling/amplify-metrics';
import { AmplifyTransformer } from './transformer';
import { hydrateTokens } from './hydrate-tokens';
import { AmplifyManifest, ResourceRecord } from '../manifest/manifest-schema';
import * as cdk from 'aws-cdk-lib';
import { AmplifyParameters } from '../stubs/amplify-parameters';
import { ServiceProviderResolver } from '../stubs/service-provider-resolver';
import { z } from 'zod';
import { SSM } from 'aws-sdk';
/**
 * This should be a first class entry point into Amplify for customers who want to integrate an Amplify manifest into an existing CDK application
 *
 * It performs all the steps necessary to resolve / fetch values referenced in the manifest file and initializes the AmplifyTransform base CDK construct
 * AmplifyTransform.transform() can then be used to initiate orchestration of Amplify generated resources
 * @param construct The CDK construct that the AmplifyTransform will exist in
 * @param tokenizedManifest The raw manifest object that should be transformed
 * @returns Initialized AmplifyTransform instance
 */
export const createTransformer = async (envName: string, tokenizedManifest: AmplifyManifest): Promise<AmplifyTransformer> => {
  // TODO new SSM() should be injected into createTransformer rather than initialized here
  const amplifyParameters = new AmplifyParameters(new SSM(), envName);

  const params = (await amplifyParameters.listParameters()).reduce((collect, param) => {
    collect[param.name] = param.isSecret ? param.ref : param.value;
    return collect;
  }, {} as Record<string, string>);

  // TODO will need more validation here to assert that manifest is correctly formed
  const hydratedResourceDefinition = hydrateTokens(tokenizedManifest.resources, params) as ResourceRecord;

  const serviceProviderResolver = new ServiceProviderResolver(cdk, consoleLogger, amplifyMetrics, z);

  // TODO execute preSynthCommand(s) here

  return new AmplifyTransformer(envName, hydratedResourceDefinition, await serviceProviderResolver.loadProviders(tokenizedManifest.providers));
};
