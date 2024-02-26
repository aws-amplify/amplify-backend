import { Construct } from 'constructs';
import { AmplifyData } from '@aws-amplify/data-construct';
import * as appsync from 'aws-cdk-lib/aws-appsync';
// TODO: uncomment after data-schema-types change is published
// import { JsResolver } from '@aws-amplify/data-schema-types';

// Temporarily adding this type for draft PR. Will be imported from data-schema-types
// once that package is updated with this new type
export type JsResolver = {
  typeName: 'Mutation' | 'Query' | 'Subscription';
  fieldName: string;
  handlers: {
    dataSource: string;
    entry: string;
  }[];
};

/**
 * Default top-level pipeline resolver template
 */
const topLevelResolver = `
export function request(ctx) {
  return {}
}
export function response(ctx) {
  return ctx.prev.result
}
`;

/**
 * Converts JS Resolver definition emitted by data-schema into AppSync pipeline
 * resolvers via the L1 construct.
 */
export const convertJsResolverDefinition = (
  scope: Construct,
  amplifyApi: AmplifyData,
  jsResolvers: JsResolver[]
): void => {
  if (!jsResolvers || jsResolvers.length < 1) {
    return;
  }

  jsResolvers.forEach((resolver) => {
    const functions = resolver.handlers.map((handler, idx) => {
      const fnName = `Fn_${resolver.typeName}_${resolver.fieldName}_${idx + 1}`;
      const fn = new appsync.CfnFunctionConfiguration(scope, fnName, {
        apiId: amplifyApi.apiId,
        dataSourceName: handler.dataSource,
        name: fnName,
        code: handler.entry,
        runtime: {
          name: 'APPSYNC_JS',
          runtimeVersion: '1.0.0',
        },
      });
      fn.node.addDependency(amplifyApi);
      return fn.attrFunctionId;
    });

    new appsync.CfnResolver(
      scope,
      `Resolver_${resolver.typeName}_${resolver.fieldName}`,
      {
        apiId: amplifyApi.apiId,
        fieldName: resolver.fieldName,
        typeName: resolver.typeName,
        kind: 'PIPELINE',
        code: topLevelResolver,
        runtime: {
          name: 'APPSYNC_JS',
          runtimeVersion: '1.0.0',
        },
        pipelineConfig: {
          functions,
        },
      }
    ).node.addDependency(amplifyApi);
  });
};
