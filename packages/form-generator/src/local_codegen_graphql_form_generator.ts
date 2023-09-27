import path from 'path';
import {
  FormFeatureFlags,
  GenericDataSchema,
  StudioForm,
} from '@aws-amplify/codegen-ui';
import {
  AmplifyFormRenderer,
  ModuleKind,
  ReactRenderConfig,
  ScriptKind,
  ScriptTarget,
} from '@aws-amplify/codegen-ui-react';
import {
  FormGenerationOptions,
  GraphqlFormGenerator,
  GraphqlGenerationResult,
} from './graphql_form_generator.js';

type FormDef = Set<'create' | 'update'>;
type ModelRecord = Record<string, FormDef>;

/**
 * Render Configuration Options for react forms
 */
export type RenderOptions = {
  graphqlDir: string;
};

export type ResultBuilder = (
  fileMap: Record<string, string>
) => GraphqlGenerationResult;

export type SchemaFetcher = () => Promise<GenericDataSchema>;
/**
 * Generates GraphQL-compatible forms in React by directly leveraging @aws-amplify/codegen-ui-react
 */
export class LocalGraphqlFormGenerator implements GraphqlFormGenerator {
  /**
   * Instantiates a LocalGraphqlFormGenerator for a provided schema
   */
  constructor(
    private schemaFetcher: SchemaFetcher,
    private renderOptions: RenderOptions,
    private resultBuilder: ResultBuilder
  ) {}
  /**
   * reduces the dataSchema to a map of models
   */
  private getModelMapForDataSchema = (dataSchema: GenericDataSchema) => {
    return Object.entries(dataSchema.models).reduce<ModelRecord>(
      (prev, [name, model]) => {
        if (!model.isJoinTable) {
          prev[name] = new Set(['create', 'update']);
        }
        return prev;
      },
      {}
    );
  };

  private getSchema = (
    name: string,
    type: 'create' | 'update'
  ): StudioForm => ({
    name: `${name}${type === 'create' ? 'CreateForm' : 'UpdateForm'}`,
    formActionType: type,
    dataType: { dataSourceType: 'DataStore', dataTypeName: name },
    fields: {},
    sectionalElements: {},
    style: {},
    cta: {},
  });

  private generateBaseForms = (modelMap: {
    [model: string]: Set<'create' | 'update'>;
  }): StudioForm[] => {
    const schemas: StudioForm[] = [];
    Object.entries(modelMap).forEach(([name, set]) => {
      set.forEach((type) => schemas.push(this.getSchema(name, type)));
    });
    return schemas;
  };
  /**
   * Gets the react render config
   */
  private get config(): ReactRenderConfig {
    return {
      module: ModuleKind.ES2020,
      target: ScriptTarget.ES2020,
      script: ScriptKind.JSX,
      renderTypeDeclarations: true,
      apiConfiguration: {
        dataApi: 'GraphQL',
        fragmentsFilePath: path.join(
          this.renderOptions.graphqlDir,
          'fragments'
        ),
        mutationsFilePath: path.join(
          this.renderOptions.graphqlDir,
          'mutations'
        ),
        queriesFilePath: path.join(this.renderOptions.graphqlDir, 'queries'),
        subscriptionsFilePath: path.join(
          this.renderOptions.graphqlDir,
          'subscriptions'
        ),
        typesFilePath: path.join(this.renderOptions.graphqlDir, 'types'),
      },
    };
  }
  private createUiBuilderForm = (
    schema: StudioForm,
    dataSchema?: GenericDataSchema,
    formFeatureFlags?: FormFeatureFlags
  ) => {
    const renderer = new AmplifyFormRenderer(
      schema,
      dataSchema,
      this.config,
      formFeatureFlags
    );
    const { componentText, declaration } = renderer.renderComponentInternal();
    return {
      componentText,
      fileName: renderer.fileName,
      declaration,
    };
  };
  private filterModelsByName = (
    filteredModelNames: string[],
    schemaModel: ModelRecord
  ) => {
    const lowerCaseModelKeys = new Set(
      Object.keys(schemaModel).map((k) => k.toLowerCase())
    );
    const modelEntries = Object.entries(schemaModel);
    return filteredModelNames.reduce<Array<[string, FormDef]>>(
      (prev, model) => {
        if (lowerCaseModelKeys?.has(model.toLowerCase())) {
          const entry = modelEntries.find(
            ([key]) => key.toLowerCase() === model.toLowerCase()
          );
          if (!entry) {
            throw new Error(`Could not find specified model ${model}`);
          }
          prev.push(entry);
          return prev;
        }
        throw new Error(`Could not find specified model ${model}`);
      },
      []
    );
  };
  private codegenForm = (
    dataSchema: GenericDataSchema,
    formSchema: StudioForm
  ) => {
    return this.createUiBuilderForm(formSchema, dataSchema, {});
  };

  private getFilteredModels = (
    dataSchema: GenericDataSchema,
    filteredModelNames?: string[]
  ) => {
    const modelMap = this.getModelMapForDataSchema(dataSchema);
    const filteredModels: Array<[string, FormDef]> = [];
    if (!filteredModelNames || !filteredModelNames?.length) {
      filteredModels.push(...Object.entries(modelMap));
    } else {
      filteredModels.push(
        ...this.filterModelsByName(filteredModelNames, modelMap)
      );
    }
    return filteredModels.reduce(
      (prev, [key, value]) => ({ ...prev, [key]: value }),
      {}
    );
  };

  generateForms = async (
    options?: FormGenerationOptions
  ): Promise<GraphqlGenerationResult> => {
    const dataSchema = await this.schemaFetcher();
    const filteredSchema = this.getFilteredModels(dataSchema, options?.models);

    const baseForms = this.generateBaseForms(filteredSchema);
    return this.resultBuilder(
      baseForms.reduce<Record<string, string>>((prev, formSchema) => {
        const result = this.codegenForm(dataSchema, formSchema);
        prev[result.fileName] = result.componentText;
        return prev;
      }, {})
    );
  };
}
