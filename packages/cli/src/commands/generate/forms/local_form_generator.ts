import { FormGenerator } from './form_generator.js';
import fs from 'fs';
import {
  AppSyncClient,
  GetIntrospectionSchemaCommand,
} from '@aws-sdk/client-appsync';
import * as graphqlCodegen from '@graphql-codegen/core';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import * as appsync from '@aws-amplify/appsync-modelgen-plugin';
import asyncPool from 'tiny-async-pool';
import { parse } from 'graphql';
import {
  AmplifyUIBuilder,
  CodegenGenericDataEnum,
  CodegenGenericDataModel,
  CodegenGenericDataNonModel,
  CodegenGenericDataField,
  CodegenJobGenericDataSchema,
  StartCodegenJobData,
  CodegenGenericDataFieldDataType,
  CodegenGenericDataRelationshipType,
  CodegenJob,
} from '@aws-sdk/client-amplifyuibuilder';
import {
  GenericDataField,
  GenericDataSchema,
  getGenericFromDataStore,
} from '@aws-amplify/codegen-ui';
import fetch from 'node-fetch';
import path from 'path';
import { generateGraphQLDocuments } from '@aws-amplify/graphql-docs-generator';
import { GraphQLStatementsFormatter } from './graphQLFormatter.js';

type CodegenGenericDataFields = Record<string, CodegenGenericDataField>;
export type LocalFormGenerationConfig = {
  introspectionSchemaUrl: string;
  apiId: string;
};
/**
 * Creates UI Forms locally based on an appsync api id
 */
export class LocalFormGenerator implements FormGenerator<void> {
  private appSyncClient;
  /**
   * Instantiates a LocalFormGenerator
   */
  constructor(private config: LocalFormGenerationConfig) {
    this.appSyncClient = new AppSyncClient();
  }

  private getAppSyncIntrospectionSchema = async (apiId: string) => {
    const result = await this.appSyncClient.send(
      new GetIntrospectionSchemaCommand({
        apiId,
        format: 'SDL',
      }),
    );
    const decoder = new TextDecoder();

    return decoder.decode(result.schema);
  };
  /**
   * Generates a form based on the config passed into the constructor.
   * The forms are persisted to disk
   */
  async generateForms(): Promise<void> {
    const appsyncIntrospectionSchema = await this.getAppSyncIntrospectionSchema(
      this.config.apiId,
    );
    const uri = this.config.introspectionSchemaUrl;

    const parseS3Uri = (uri: string): { bucket: string; key: string } => {
      const regex = new RegExp('s3://(.*?)/(.*)');
      const match = uri.match(regex);
      if (match?.length !== 3 || !match[1] || !match[2]) {
        throw new Error(
          'Could not identify bucket and key name for introspection schema',
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
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    const schema = await getSchemaCommandResult.Body?.transformToString();
    if (!schema) {
      throw new Error('Error when parsing output schema');
    }
    const result = await appsync.preset.buildGeneratesSection({
      baseOutputDir: './',
      schema: parse(schema) as any,
      config: {
        directives:
          'directive @aws_subscribe(mutations: [String!]!) on FIELD_DEFINITION\n\ndirective @aws_auth(cognito_groups: [String!]!) on FIELD_DEFINITION\n\ndirective @aws_api_key on FIELD_DEFINITION | OBJECT\n\ndirective @aws_iam on FIELD_DEFINITION | OBJECT\n\ndirective @aws_oidc on FIELD_DEFINITION | OBJECT\n\ndirective @aws_cognito_user_pools(cognito_groups: [String!]) on FIELD_DEFINITION | OBJECT\n\ndirective @aws_lambda on FIELD_DEFINITION | OBJECT\n\ndirective @deprecated(reason: String) on FIELD_DEFINITION | INPUT_FIELD_DEFINITION | ENUM | ENUM_VALUE\n\ndirective @model(queries: ModelQueryMap, mutations: ModelMutationMap, subscriptions: ModelSubscriptionMap, timestamps: TimestampConfiguration) on OBJECT\ninput ModelMutationMap {\n  create: String\n  update: String\n  delete: String\n}\ninput ModelQueryMap {\n  get: String\n  list: String\n}\ninput ModelSubscriptionMap {\n  onCreate: [String]\n  onUpdate: [String]\n  onDelete: [String]\n  level: ModelSubscriptionLevel\n}\nenum ModelSubscriptionLevel {\n  off\n  public\n  on\n}\ninput TimestampConfiguration {\n  createdAt: String\n  updatedAt: String\n}\ndirective @function(name: String!, region: String, accountId: String) repeatable on FIELD_DEFINITION\ndirective @http(method: HttpMethod = GET, url: String!, headers: [HttpHeader] = []) on FIELD_DEFINITION\nenum HttpMethod {\n  GET\n  POST\n  PUT\n  DELETE\n  PATCH\n}\ninput HttpHeader {\n  key: String\n  value: String\n}\ndirective @predictions(actions: [PredictionsActions!]!) on FIELD_DEFINITION\nenum PredictionsActions {\n  identifyText\n  identifyLabels\n  convertTextToSpeech\n  translateText\n}\ndirective @primaryKey(sortKeyFields: [String]) on FIELD_DEFINITION\ndirective @index(name: String, sortKeyFields: [String], queryField: String) repeatable on FIELD_DEFINITION\ndirective @hasMany(indexName: String, fields: [String!], limit: Int = 100) on FIELD_DEFINITION\ndirective @hasOne(fields: [String!]) on FIELD_DEFINITION\ndirective @manyToMany(relationName: String!, limit: Int = 100) on FIELD_DEFINITION\ndirective @belongsTo(fields: [String!]) on FIELD_DEFINITION\ndirective @default(value: String!) on FIELD_DEFINITION\ndirective @auth(rules: [AuthRule!]!) on OBJECT | FIELD_DEFINITION\ninput AuthRule {\n  allow: AuthStrategy!\n  provider: AuthProvider\n  identityClaim: String\n  groupClaim: String\n  ownerField: String\n  groupsField: String\n  groups: [String]\n  operations: [ModelOperation]\n}\nenum AuthStrategy {\n  owner\n  groups\n  private\n  public\n  custom\n}\nenum AuthProvider {\n  apiKey\n  iam\n  oidc\n  userPools\n  function\n}\nenum ModelOperation {\n  create\n  update\n  delete\n  read\n  list\n  get\n  sync\n  listen\n  search\n}\ndirective @mapsTo(name: String!) on OBJECT\ndirective @searchable(queries: SearchableQueryMap) on OBJECT\ninput SearchableQueryMap {\n  search: String\n}',
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

    const generatedStatements = generateGraphQLDocuments(
      appsyncIntrospectionSchema,
      {
        maxDepth: 3,
        typenameIntrospection: true,
      },
    );
    const language = 'typescript';
    const opsGenDir = './src/graphql';
    fs.mkdirSync(opsGenDir, { recursive: true });
    await Promise.all(
      ['queries', 'mutations', 'subscriptions'].flatMap(async (op) => {
        const ops =
          generatedStatements[
            op as unknown as keyof typeof generatedStatements
          ];
        const formatter = new GraphQLStatementsFormatter(language);
        const outputFile = path.resolve(path.join(opsGenDir, `${op}.ts`));
        fs.writeFileSync(outputFile, await formatter.format(ops as any));
      }),
    );

    const d = getGenericFromDataStore(JSON.parse(synced));
    const genericDataSchema = this.mapGenericDataSchemaToCodegen(d);
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
        } as unknown as any,
      },
    };
    const uiClient = new AmplifyUIBuilder({
      endpoint: 'https://tzhtbadkkh.execute-api.us-west-2.amazonaws.com/prod/',
    });
    const appId = 'dkne2bw3gmwb0';
    const environmentName = '_AMPLIFY_SAMSARA_INTERNAL_';
    const response = await uiClient.startCodegenJob({
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
    } as any);
    const jobId = response.entity?.id;
    if (!jobId) {
      throw new TypeError('job id is null');
    }
    const finished = await this.waitForSucceededJob(
      async () => {
        const { job } = await uiClient.getCodegenJob({
          appId,
          environmentName,
          id: jobId,
        });
        if (!job) throw Error('job is not defined');
        return job;
      },
      {
        pollInterval: 2000,
      },
    );
    if (!finished.asset?.downloadUrl) {
      throw new Error('did not get download url');
    }
    await this.extractUIComponents(
      finished.asset?.downloadUrl,
      './src/ui-components',
    );
  }

  delay = (durationMs: number): Promise<void> => {
    return new Promise((r) => setTimeout(() => r(), durationMs));
  };
  waitForSucceededJob = async (
    getJob: () => Promise<CodegenJob>,
    { pollInterval }: { pollInterval: number },
  ) => {
    const startTime = performance.now();
    const waitTimeout = process.env.UI_BUILDER_CODEGENJOB_TIMEOUT
      ? parseInt(process.env.UI_BUILDER_CODEGENJOB_TIMEOUT)
      : 1000 * 60 * 2;

    const endTime = startTime + waitTimeout;

    while (performance.now() < endTime) {
      const job = await getJob();

      if (!job) {
        throw new Error('Codegen job not found');
      }

      if (job.status === 'failed') {
        console.error('Codegen job status is failed', {
          message: job.statusMessage,
        });
        throw new Error(job.statusMessage);
      }

      if (job.status === 'succeeded') {
        console.debug(`Polling time: ${performance.now() - startTime}`);

        return job;
      }

      await this.delay(pollInterval);
    }

    if (performance.now() > endTime) {
      console.error(`Codegen job never succeeded before timeout`);
    }

    throw new Error('Failed to return codegen job');
  };

  fetchWithRetries = async (url: string, retries = 3, delay = 300) => {
    let retryCount = 0;
    let retryDelay = delay;

    while (retryCount < retries) {
      try {
        const response = await fetch(url);
        return response;
      } catch (error) {
        console.debug(`Error fetching ${url}: ${error}`);
        retryCount = retryCount + 1;
        await new Promise((res) => setTimeout(res, delay));
        retryDelay = retryDelay * 2;
      }
    }
    throw new Error('Fetch reached max number of retries without succeeding');
  };
  extractUIComponents = async (
    url: string,
    uiBuilderComponentsPath: string,
  ) => {
    try {
      if (!fs.existsSync(uiBuilderComponentsPath)) {
        fs.mkdirSync(uiBuilderComponentsPath, { recursive: true });
      }

      const response = await this.fetchWithRetries(url);
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
            const response = await this.fetchWithRetries(output.downloadUrl);
            if (!response.ok) {
              console.debug(`Failed to download ${output.fileName}`);
              throw new Error(`Failed to download ${output.fileName}`);
            }
            return {
              content: await response.text(),
              error: undefined,
              fileName: output.fileName,
            };
          } catch (error) {
            console.debug(
              `Skipping ${output.fileName} because of an error downloading the component`,
            );
            return {
              error: `Failed to download ${output.fileName}`,
              content: undefined,
              fileName: output.fileName,
            };
          }
        } else {
          console.debug(
            `Skipping ${output.fileName} because of an error generating the component`,
          );
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
        downloadComponent,
      )) {
        if (downloaded.content) {
          fs.writeFileSync(
            path.join(uiBuilderComponentsPath, downloaded.fileName),
            downloaded.content,
          );
          console.debug(`Downloaded ${downloaded.fileName}`);
        }
      }
      console.debug('ui-components downloaded successfully');
    } catch (error) {
      console.error('failed to download ui-components');
      throw error;
    }
  };
  mapRelationshipTypeToCodegen = (
    relationship: CodegenGenericDataRelationshipType | undefined,
  ): CodegenGenericDataRelationshipType | undefined => {
    if (!relationship) return undefined;

    switch (relationship.type) {
      case 'HAS_MANY':
        return {
          type: 'HAS_MANY',
          relatedModelFields: relationship.relatedModelFields,
          canUnlinkAssociatedModel: !!relationship.canUnlinkAssociatedModel,
          relatedJoinFieldName: relationship.relatedJoinFieldName,
          relatedJoinTableName: relationship.relatedJoinTableName,
          belongsToFieldOnRelatedModel:
            relationship.belongsToFieldOnRelatedModel,
          relatedModelName: relationship.relatedModelName,
        };
      case 'HAS_ONE':
        return {
          type: 'HAS_ONE',
          associatedFields: relationship.associatedFields,
          isHasManyIndex: !!relationship.isHasManyIndex,
          relatedModelName: relationship.relatedModelName,
        };
      case 'BELONGS_TO':
        return {
          type: 'BELONGS_TO',
          associatedFields: relationship.associatedFields,
          isHasManyIndex: !!relationship.isHasManyIndex,
          relatedModelName: relationship.relatedModelName,
        };
      default:
        throw new Error('Invalid relationship type');
    }
  };
  mapDataFieldsToCodegen = (fields: {
    [fieldName: string]: GenericDataField;
  }): CodegenGenericDataFields => {
    const codegenFields: CodegenGenericDataFields = {};

    Object.entries(fields).forEach(([fieldName, dataField]) => {
      let dataType: CodegenGenericDataFieldDataType;
      let dataTypeValue = '';
      if (
        typeof dataField.dataType === 'object' &&
        dataField.dataType !== null
      ) {
        if ('enum' in dataField.dataType) {
          dataType = 'Enum';
          dataTypeValue = dataField.dataType.enum;
        } else if ('model' in dataField.dataType) {
          dataType = 'Model';
          dataTypeValue = dataField.dataType.model;
        } else if ('nonModel' in dataField.dataType) {
          dataType = 'NonModel';
          dataTypeValue = dataField.dataType.nonModel;
        }
      } else {
        dataType = dataField.dataType;
        dataTypeValue = dataField.dataType;
      }
      codegenFields[fieldName] = {
        dataType: dataType!,
        dataTypeValue: dataTypeValue,
        required: dataField.required,
        readOnly: dataField.readOnly,
        isArray: dataField.isArray,
      };
      if (dataField.relationship) {
        codegenFields[fieldName].relationship =
          this.mapRelationshipTypeToCodegen(dataField.relationship);
      }
    });

    return codegenFields;
  };
  mapGenericDataSchemaToCodegen = (
    genericDataSchema: GenericDataSchema,
  ): CodegenJobGenericDataSchema => {
    const { models, nonModels, enums, dataSourceType } = genericDataSchema;
    const codegenModels: { [key: string]: CodegenGenericDataModel } = {};
    const codegenNonModels: { [key: string]: CodegenGenericDataNonModel } = {};
    const codegenEnums: { [key: string]: CodegenGenericDataEnum } = {};

    Object.entries(models).forEach(([modelName, genericDataModel]) => {
      const modelFields = this.mapDataFieldsToCodegen(genericDataModel.fields);

      codegenModels[modelName] = {
        isJoinTable: genericDataModel.isJoinTable,
        primaryKeys: genericDataModel.primaryKeys,
        fields: modelFields,
      };
    });

    Object.entries(nonModels).forEach(([nonModelName, genericDataModel]) => {
      const nonModelFields = this.mapDataFieldsToCodegen(
        genericDataModel.fields,
      );

      codegenNonModels[nonModelName] = {
        fields: nonModelFields,
      };
    });

    Object.entries(enums).forEach(([enumName, genericEnum]) => {
      codegenEnums[enumName] = {
        values: genericEnum.values,
      };
    });

    return {
      models: codegenModels,
      nonModels: codegenNonModels,
      enums: codegenEnums,
      dataSourceType,
    };
  };
}
