import {
  GenericDataSchema,
  getGenericFromDataStore,
} from '@aws-amplify/codegen-ui';
import { parse } from 'graphql';
import * as graphqlCodegen from '@graphql-codegen/core';
import * as appsync from '@aws-amplify/appsync-modelgen-plugin';
import { directives } from './aws_graphql_directives.js';

/**
 * Transforms an AppSync introspection schema for use in form generation
 */
export const transformAppsyncIntrospectionSchema = async (
  appSyncIntrospectionSchema: string
): Promise<GenericDataSchema> => {
  const result = await appsync.preset.buildGeneratesSection({
    baseOutputDir: './',
    schema: parse(appSyncIntrospectionSchema),
    config: {
      directives,
      isTimestampFieldsAdded: true,
      emitAuthProvider: true,
      generateIndexRules: true,
      handleListNullabilityTransparently: true,
      usePipelinedTransformer: true,
      transformerVersion: 2,
      respectPrimaryKeyAttributesOnConnectionField: true,
      improvePluralization: false,
      generateModelsForLazyLoadAndCustomSelectionSet: false,
      target: 'introspection',
      overrideOutputDir: './',
    },
    documents: [],
    pluginMap: {},
    presetConfig: {
      overrideOutputDir: null,
      target: 'typescript',
    },
    plugins: [],
  });
  const results = result.map((cfg) => {
    return graphqlCodegen.codegen({
      ...cfg,
      config: {
        ...cfg.config,
      },
      plugins: [
        {
          appSyncLocalCodeGen: {},
        },
      ],
      pluginMap: {
        appSyncLocalCodeGen: appsync,
      },
    });
  });

  const [synced] = await Promise.all(results);
  const d = getGenericFromDataStore(JSON.parse(synced));
  return d;
};
