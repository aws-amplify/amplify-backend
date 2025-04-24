import { Construct } from 'constructs';
import { AmplifyData } from '@aws-amplify/data-construct';
import { CfnFunctionConfiguration, CfnResolver } from 'aws-cdk-lib/aws-appsync';
import { JsResolver } from '@aws-amplify/data-schema-types';
import { resolve } from 'path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'fs';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { resolveEntryPath } from './resolve_entry_path.js';
import { CDKContextKey } from '@aws-amplify/platform-core';

const APPSYNC_PIPELINE_RESOLVER = 'PIPELINE';
const APPSYNC_JS_RUNTIME_NAME = 'APPSYNC_JS';
const APPSYNC_JS_RUNTIME_VERSION = '1.0.0';
const JS_PIPELINE_RESOLVER_HANDLER = './assets/js_resolver_handler.js';

/**
 *
 * This returns the top-level passthrough resolver request/response handler (see: https://docs.aws.amazon.com/appsync/latest/devguide/resolver-reference-overview-js.html#anatomy-of-a-pipeline-resolver-js)
 * It's required for defining a pipeline resolver. The only purpose it serves is returning the output of the last function in the pipeline back to the client.
 *
 * Customer-provided handlers are added as a Functions list in `pipelineConfig.functions`
 *
 * Add Amplify API ID and environment name to the context stash for use in the customer-provided handlers.
 */
export const defaultJsResolverCode = (
  amplifyApiId: string,
  amplifyApiEnvironmentName: string,
): string => {
  const resolvedTemplatePath = resolve(
    fileURLToPath(import.meta.url),
    '../../lib',
    JS_PIPELINE_RESOLVER_HANDLER,
  );

  return readFileSync(resolvedTemplatePath, 'utf-8')
    .replace(new RegExp(/\$\{amplifyApiId\}/, 'g'), amplifyApiId)
    .replace(
      new RegExp(/\$\{amplifyApiEnvironmentName\}/, 'g'),
      amplifyApiEnvironmentName,
    );
};

/**
 * Converts JS Resolver definition emitted by data-schema into AppSync pipeline
 * resolvers via L1 construct
 */
export const convertJsResolverDefinition = (
  scope: Construct,
  amplifyApi: AmplifyData,
  jsResolvers: JsResolver[] | undefined,
): void => {
  if (!jsResolvers || jsResolvers.length < 1) {
    return;
  }

  for (const resolver of jsResolvers) {
    const functions: string[] = resolver.handlers.map((handler, idx) => {
      const fnName = `Fn_${resolver.typeName}_${resolver.fieldName}_${idx + 1}`;
      const s3AssetName = `${fnName}_asset`;

      const asset = new Asset(scope, s3AssetName, {
        path: resolveEntryPath(handler.entry),
      });

      const fn = new CfnFunctionConfiguration(scope, fnName, {
        apiId: amplifyApi.apiId,
        dataSourceName: handler.dataSource,
        name: fnName,
        codeS3Location: asset.s3ObjectUrl,
        runtime: {
          name: APPSYNC_JS_RUNTIME_NAME,
          runtimeVersion: APPSYNC_JS_RUNTIME_VERSION,
        },
      });
      fn.node.addDependency(amplifyApi);
      return fn.attrFunctionId;
    });

    const resolverName = `Resolver_${resolver.typeName}_${resolver.fieldName}`;

    const isSandboxDeployment =
      scope.node.tryGetContext(CDKContextKey.DEPLOYMENT_TYPE) === 'sandbox';
    const amplifyApiEnvironmentName = isSandboxDeployment
      ? 'NONE'
      : scope.node.tryGetContext(CDKContextKey.BACKEND_NAME);
    new CfnResolver(scope, resolverName, {
      apiId: amplifyApi.apiId,
      fieldName: resolver.fieldName,
      typeName: resolver.typeName,
      kind: APPSYNC_PIPELINE_RESOLVER,
      // Uses synth-time inline code to avoid circular dependency when adding the API ID as an environment variable.
      code: defaultJsResolverCode(amplifyApi.apiId, amplifyApiEnvironmentName),
      runtime: {
        name: APPSYNC_JS_RUNTIME_NAME,
        runtimeVersion: APPSYNC_JS_RUNTIME_VERSION,
      },
      pipelineConfig: {
        functions,
      },
    }).node.addDependency(amplifyApi);
  }
};
