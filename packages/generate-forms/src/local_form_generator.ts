import { FormGenerator } from './form_generator.js';
import fs from 'fs';
import * as graphqlCodegen from '@graphql-codegen/core';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import * as appsync from '@aws-amplify/appsync-modelgen-plugin';
import asyncPool from 'tiny-async-pool';
import { parse } from 'graphql';
import {
  AmplifyUIBuilder,
  CodegenJobGenericDataSchema,
  StartCodegenJobData,
} from '@aws-sdk/client-amplifyuibuilder';
import { getGenericFromDataStore } from '@aws-amplify/codegen-ui';
import { fetchWithRetries } from './fetch.js';
import path from 'path';
import { directives } from './aws_graphql_directives.js';
import { CodegenJobHandler } from './codegen_job_handler.js';
import { mapGenericDataSchemaToCodegen } from './schema_mappers.js';

export type LocalFormGenerationConfig = {
  introspectionSchemaUrl: string;
  apiId: string;
  appId: string;
  environmentName?: string;
};

/**
 * Creates UI Forms locally based on an appsync api id
 */
export class LocalFormGenerator implements FormGenerator<void> {
  /**
   * Instantiates a LocalFormGenerator
   */
  constructor(
    private config: LocalFormGenerationConfig,
    private uiClient: AmplifyUIBuilder
  ) {}

  /**
   * Generates a form based on the config passed into the constructor.
   * The forms are persisted to disk
   */
  generateForms = async (): Promise<void> => {
    const modelIntrospectionSchema =
      await this.generateModelIntrospectionSchema();
    const job = this.generateJobInput({
      genericDataSchema: modelIntrospectionSchema,
      appId: this.config.appId,
      environmentName: this.config.environmentName,
    });
    const jobHandler = new CodegenJobHandler(this.uiClient);
    const downloadUrl = await jobHandler.execute(job);

    await this.extractUIComponents(downloadUrl, './src/ui-components');
  };

  private getAppSchema = async (uri: string) => {
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
    const client = new S3Client();
    const getSchemaCommandResult = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    );
    const schema = await getSchemaCommandResult.Body?.transformToString();
    if (!schema) {
      throw new Error('Error when parsing output schema');
    }
    return schema;
  };

  private generateModelIntrospectionSchema = async () => {
    const uri = this.config.introspectionSchemaUrl;
    const schema = await this.getAppSchema(uri);

    const result = await appsync.preset.buildGeneratesSection({
      baseOutputDir: './',
      schema: parse(schema) as any,
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
  private generateJobInput = ({
    genericDataSchema,
    appId,
    environmentName,
  }: {
    genericDataSchema: CodegenJobGenericDataSchema;
    appId: string;
    environmentName?: string;
  }) => {
    const job: StartCodegenJobData = {
      autoGenerateForms: true,
      genericDataSchema,
      renderConfig: {
        react: {
          module: 'es2020',
          target: 'es2020',
          script: 'jsx',
          renderTypeDeclarations: true,
          apiConfiguration: {
            graphQLConfig: {
              typesFilePath: '../graphql/types',
              queriesFilePath: '../graphql/queries',
              mutationsFilePath: '../graphql/mutations',
              subscriptionsFilePath: '../graphql/subscriptions',
              fragmentsFilePath: '../graphql/fragments',
            },
          },
        },
      },
    };
    return {
      appId,
      clientToken: '',
      environmentName,
      codegenJobToCreate: job,
      apiConfiguration: {
        graphQLConfig: {
          typesFilePath: '../graphql/types',
          queriesFilePath: '../graphql/queries',
          mutationsFilePath: '../graphql/mutations',
          subscriptionsFilePath: '../graphql/subscriptions',
          fragmentsFilePath: '../graphql/fragments',
        },
      },
    };
  };

  private extractUIComponents = async (
    url: string,
    uiBuilderComponentsPath: string
  ) => {
    if (!fs.existsSync(uiBuilderComponentsPath)) {
      fs.mkdirSync(uiBuilderComponentsPath, { recursive: true });
    }

    const response = await fetchWithRetries(url);
    if (!response.ok) {
      throw new Error('Failed to download component manifest file');
    }
    const manifestFile = await (<
      Promise<{
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Output: {
          downloadUrl: string | undefined;
          fileName: string;
          schemaName: string;
          error: string | undefined;
        }[];
      }>
    >response.json());

    const downloadComponent = async (output: {
      fileName: string;
      downloadUrl: string | undefined;
      error: string | undefined;
    }) => {
      if (output.downloadUrl && !output.error) {
        try {
          const response = await fetchWithRetries(output.downloadUrl);
          if (!response.ok) {
            throw new Error(`Failed to download ${output.fileName}`);
          }
          return {
            content: await response.text(),
            error: undefined,
            fileName: output.fileName,
          };
        } catch (error) {
          return {
            error: `Failed to download ${output.fileName}`,
            content: undefined,
            fileName: output.fileName,
          };
        }
      } else {
        return {
          error: output.error,
          content: undefined,
          fileName: output.fileName,
        };
      }
    };

    for await (const downloaded of asyncPool(
      5,
      manifestFile.Output,
      downloadComponent
    )) {
      if (downloaded.content) {
        fs.writeFileSync(
          path.join(uiBuilderComponentsPath, downloaded.fileName),
          downloaded.content
        );
      }
    }
  };
}
