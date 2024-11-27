import { Construct } from 'constructs';
import { AmplifyData } from '@aws-amplify/data-construct';
import { CfnFunctionConfiguration, CfnResolver } from 'aws-cdk-lib/aws-appsync';
import { JsResolver } from '@aws-amplify/data-schema-types';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { resolveEntryPath } from './resolve_entry_path.js';

const APPSYNC_PIPELINE_RESOLVER = 'PIPELINE';
const APPSYNC_JS_RUNTIME_NAME = 'APPSYNC_JS';
const APPSYNC_JS_RUNTIME_VERSION = '1.0.0';

/**
 * Converts JS Resolver definition emitted by data-schema into AppSync pipeline
 * resolvers via L1 construct
 */
export const convertJsResolverDefinition = (
  scope: Construct,
  amplifyApi: AmplifyData,
  jsResolvers: JsResolver[] | undefined
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

    const amplifyEnvironmentName =
      scope.node.tryGetContext('amplifyEnvironmentName') ?? 'NONE';
    new CfnResolver(scope, resolverName, {
      apiId: amplifyApi.apiId,
      fieldName: resolver.fieldName,
      typeName: resolver.typeName,
      kind: APPSYNC_PIPELINE_RESOLVER,
      /**
       * The top-level passthrough resolver request/response handler (see: https://docs.aws.amazon.com/appsync/latest/devguide/resolver-reference-overview-js.html#anatomy-of-a-pipeline-resolver-js)
       * It's required for defining a pipeline resolver. Adds the GraphQL API ID and Amplify environment name to the context stash.
       * Returns the output of the last function in the pipeline back to the client.
       *
       * Customer-provided handlers are added as a Functions list in `pipelineConfig.functions`
       *
       * Uses synth-time inline code to avoid circular dependency when adding the API ID as an environment variable.
       */
      code: `
        /**
         * Pipeline resolver request handler
         */
        export const request = (ctx) => {
          ctx.stash.awsAppsyncApiId = '${amplifyApi.apiId}';
          ctx.stash.awsAmplifyEnvironmentName = '${amplifyEnvironmentName}';
          return {};
        };
        /**
         * Pipeline resolver response handler
         */
        export const response = (ctx) => {
          return ctx.prev.result;
        };
      `,
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
