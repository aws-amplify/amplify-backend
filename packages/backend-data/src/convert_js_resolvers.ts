import { Construct } from 'constructs';
import { AmplifyData } from '@aws-amplify/data-construct';
import { CfnFunctionConfiguration, CfnResolver } from 'aws-cdk-lib/aws-appsync';
import { JsResolver } from '@aws-amplify/data-schema-types';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { resolveEntryPath } from './resolve_entry_path.js';

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
 */
const defaultJsResolverAsset = (scope: Construct): Asset => {
  const resolvedTemplatePath = resolve(
    fileURLToPath(import.meta.url),
    '../../lib',
    JS_PIPELINE_RESOLVER_HANDLER
  );

  return new Asset(scope, 'default_js_resolver_handler_asset', {
    path: resolveEntryPath(resolvedTemplatePath),
  });
};

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

  const jsResolverTemplateAsset = defaultJsResolverAsset(scope);

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

    new CfnResolver(scope, resolverName, {
      apiId: amplifyApi.apiId,
      fieldName: resolver.fieldName,
      typeName: resolver.typeName,
      kind: APPSYNC_PIPELINE_RESOLVER,
      codeS3Location: jsResolverTemplateAsset.s3ObjectUrl,
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
