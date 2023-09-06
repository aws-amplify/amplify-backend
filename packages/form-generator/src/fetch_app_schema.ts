import { getGenericFromDataStore } from '@aws-amplify/codegen-ui';
import { mapGenericDataSchemaToCodegen } from './schema_mappers.js';
import { parse } from 'graphql';
import * as graphqlCodegen from '@graphql-codegen/core';
import * as appsync from '@aws-amplify/appsync-modelgen-plugin';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { directives } from './aws_graphql_directives.js';

const fetchAppSchema = async (
  s3Client: S3Client,
  uri: string
): Promise<string> => {
  const parseS3Uri = (uri: string): { bucket: string; key: string } => {
    const regex = new RegExp('s3://(.*?)/(.*)');
    const match = uri.match(regex);
    if (match?.length !== 3 || !match[1] || !match[2]) {
      throw new Error(
        'Could not identify bucket and key name for introspection schema'
      );
    }
    return {
      bucket: match[1],
      key: match[2],
    };
  };
  const { bucket, key } = parseS3Uri(uri);
  const getSchemaCommandResult = await s3Client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  );
  const schema = await getSchemaCommandResult.Body?.transformToString();
  if (!schema) {
    throw new Error('Error when parsing output schema');
  }
  return schema;
};
/**
 * Given an s3 client and an s3 url, fetches the deployed schema from the s3 bucket
 */
export const generateModelIntrospectionSchema = async (
  s3Client: S3Client,
  uri: string
) => {
  const schema = await fetchAppSchema(s3Client, uri);

  const result = await appsync.preset.buildGeneratesSection({
    baseOutputDir: './',
    schema: parse(schema),
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
  return mapGenericDataSchemaToCodegen(d);
};
