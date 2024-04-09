import os from 'os';
import {
  GenericDataSchema,
  getGenericFromDataStore,
} from '@aws-amplify/codegen-ui';
import { parse } from 'graphql';
import * as graphqlCodegen from '@graphql-codegen/core';
import * as appsync from '@aws-amplify/appsync-modelgen-plugin';
import { DefaultDirectives, Directive } from '@aws-amplify/graphql-directives';

/**
 * Transforms an AppSync introspection schema for use in form generation
 */
export const transformIntrospectionSchema = async (
  modelIntrospectionSchema: string
): Promise<GenericDataSchema> => {
  const result = await appsync.preset.buildGeneratesSection({
    baseOutputDir: './',
    schema: parse(modelIntrospectionSchema),
    config: {
      directives: DefaultDirectives.map(
        (directive: Directive) => directive.definition
      ).join(os.EOL),
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
  return getGenericFromDataStore(JSON.parse(synced));
};
