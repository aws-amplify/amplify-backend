import {
  FormFeatureFlags,
  GenericDataSchema,
  StudioForm,
  StudioSchema,
} from '@aws-amplify/codegen-ui';
import {
  AmplifyFormRenderer,
  ModuleKind,
  ReactIndexStudioTemplateRenderer,
  ReactRenderConfig,
  ReactUtilsStudioTemplateRenderer,
  ScriptKind,
  ScriptTarget,
  UtilTemplateType,
  getDeclarationFilename,
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
  private static defaultConfig = {
    module: ModuleKind.ES2020,
    target: ScriptTarget.ES2020,
    script: ScriptKind.JSX,
    renderTypeDeclarations: true,
  };

  /**
   * Instantiates a LocalGraphqlFormGenerator for a provided schema
   */
  constructor(
    private schemaFetcher: SchemaFetcher,
    private renderOptions: RenderOptions,
    private resultBuilder: ResultBuilder
  ) {}

  /**
   * Gets the react render config
   */
  private get config(): ReactRenderConfig {
    return {
      module: ModuleKind.ES2020,
      target: ScriptTarget.ES2020,
      script: ScriptKind.JSX,
      includeUseClientDirective: true,
      renderTypeDeclarations: true,
      apiConfiguration: {
        dataApi: 'GraphQL',
        fragmentsFilePath: this.renderGraphqlPath('fragments'),
        mutationsFilePath: this.renderGraphqlPath('mutations'),
        queriesFilePath: this.renderGraphqlPath('queries'),
        subscriptionsFilePath: this.renderGraphqlPath('subscriptions'),
        typesFilePath: this.renderGraphqlPath('types'),
      },
      dependencies: {
        // Tell the renderer to generate amplify js v6 compatible code
        'aws-amplify': '^6.0.0',
      },
    };
  }

  generateIndexFile = (schemas: { name: string }[]) => {
    const { componentText, fileName } = this.createIndexFile(
      schemas as StudioSchema[]
    );
    return {
      schemaName: 'AmplifyStudioIndexFile',
      componentText,
      fileName,
      declaration: undefined,
      error: undefined,
    };
  };

  generateForms = async (
    options?: FormGenerationOptions
  ): Promise<GraphqlGenerationResult> => {
    const dataSchema = await this.schemaFetcher();
    const filteredModels = this.getFilteredModels(dataSchema, options?.models);
    const filteredSchema = this.transformModelListToMap(filteredModels);
    const utilFile = this.generateUtilFile();
    const baseForms = this.generateBaseForms(filteredSchema);
    const indexFile = this.generateIndexFile(
      baseForms.map(({ name }) => ({
        name,
      }))
    );

    dataSchema.models = Object.entries(dataSchema.models).reduce<
      (typeof dataSchema)['models']
    >((prev, [key, value]) => {
      prev[key] = value;

      return prev;
    }, {});

    const forms = baseForms.reduce<Record<string, string>>(
      (prev, formSchema) => {
        const results = this.codegenForm(dataSchema, formSchema);
        results.forEach((result) => {
          prev[result.fileName] = result.componentText;
        });
        return prev;
      },
      {}
    );
    forms[utilFile.fileName] = utilFile.componentText;
    forms[indexFile.fileName] = indexFile.componentText;
    return this.resultBuilder(forms);
  };

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

  private renderGraphqlPath = (
    submodule: 'fragments' | 'mutations' | 'queries' | 'types' | 'subscriptions'
  ) => {
    const graphqlPath = `${this.renderOptions.graphqlDir}/${submodule}`;
    // if the path does not start with a leading ./ or ../, assume that the graphql folder is in the same directory relative to the ui, and prepend a `./`
    if (graphqlPath.startsWith('.')) {
      return graphqlPath;
    }
    return `./${graphqlPath}`;
  };

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
    const files = [
      {
        componentText,
        fileName: renderer.fileName,
      },
    ];
    if (declaration) {
      files.push({
        componentText: declaration,
        fileName: getDeclarationFilename(renderer.fileName),
      });
    }

    return files;
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
    return filteredModels;
  };
  private transformModelListToMap = (models: Array<[string, FormDef]>) => {
    return models.reduce(
      (prev, [key, value]) => ({ ...prev, [key]: value }),
      {}
    );
  };

  private createUtilFile = (utils: UtilTemplateType[]) => {
    const renderer = new ReactUtilsStudioTemplateRenderer(utils, this.config);
    const { componentText } = renderer.renderComponentInternal();
    return {
      componentText,
      fileName: renderer.fileName,
    };
  };

  /**
   * Return utils file text
   */
  private generateUtilFile = () => {
    const utils: UtilTemplateType[] = [
      'validation',
      'formatter',
      'fetchByPath',
      'processFile',
    ];
    const { componentText, fileName } = this.createUtilFile(utils);
    return {
      schemaName: 'AmplifyStudioUtilFile',
      componentText,
      fileName,
      declaration: undefined,
      error: undefined,
    };
  };

  private createIndexFile = (schemas: StudioSchema[]) => {
    const renderer = new ReactIndexStudioTemplateRenderer(
      schemas,
      LocalGraphqlFormGenerator.defaultConfig
    );
    const { componentText } = renderer.renderComponentInternal();
    return {
      componentText,
      fileName: renderer.fileName,
    };
  };
}
