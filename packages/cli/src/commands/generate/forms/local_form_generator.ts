import { FormGenerator } from './form_generator.js';
import fs from 'fs';
import {
  AppSyncClient,
  GetIntrospectionSchemaCommand,
} from '@aws-sdk/client-appsync';
import { generateGraphQLDocuments } from '@aws-amplify/graphql-docs-generator';
import * as graphqlCodegen from '@graphql-codegen/core';
import * as appsync from '@aws-amplify/appsync-modelgen-plugin';
import * as appSyncDataStoreCodeGen from '@aws-amplify/appsync-modelgen-plugin';
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
  GenericDataRelationshipType,
  CodegenGenericDataRelationshipType,
} from '@aws-sdk/client-amplifyuibuilder';
import {
  GenericDataField,
  GenericDataSchema,
  getGenericFromDataStore,
} from '@aws-amplify/codegen-ui';

type CodegenGenericDataFields = Record<string, CodegenGenericDataField>;
export type LocalFormGenerationConfig = {
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
      })
    );
    const decoder = new TextDecoder();

    return decoder.decode(result.schema);
  };
  /**
   * Generates a form based on the config passed into the constructor.
   * The forms are persisted to disk
   */
  async generateForms(): Promise<void> {
    //const schema = await this.getAppSyncIntrospectionSchema(this.config.apiId);
    // const docs = generateGraphQLDocuments(schema, { maxDepth: 3 });
    //console.log('schema', schema);
    const schema = fs.readFileSync('./schema.graphql', 'utf8');
    const result = await appsync.preset.buildGeneratesSection({
      baseOutputDir: './',
      schema: parse(schema) as any,
      config: {
        target: 'introspection',
        overrideOutputDir: null,
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
          appSyncLocalCodeGen: appSyncDataStoreCodeGen,
        },
      });
    });
    const [synced] = await Promise.all(results);

    const genericDataSchema = this.mapGenericDataSchemaToCodegen(
      JSON.parse(synced)
    );
    const job: StartCodegenJobData = {
      autoGenerateForms: true,
      genericDataSchema,
      renderConfig: {
        react: {
          module: 'es2020',
          target: 'es2020',
          script: 'jsx',
          renderTypeDeclarations: true,
        },
      },
    };
    console.log('!!!! GENERIC !!!!');
    console.log(genericDataSchema);
    const uiClient = new AmplifyUIBuilder();
    //    const response = uiClient.startCodegenJob({
    //      appId: 'd20by0kaw65zly',
    //      clientToken: '',
    //      environmentName: 'staging',
    //      codegenJobToCreate: job,
    //    });
  }

  mapRelationshipTypeToCodegen = (
    relationship: CodegenGenericDataRelationshipType | undefined
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
    genericDataSchema: GenericDataSchema
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
        genericDataModel.fields
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
