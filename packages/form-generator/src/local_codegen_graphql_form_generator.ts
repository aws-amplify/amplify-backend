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
  GraphqlFormGenerator,
  GraphqlGenerationResult,
} from './graphql_form_generator.js';
import { CodegenGraphqlFormGeneratorResult } from './codegen_graphql_form_generation_result.js';

/**
 * Render Configuration Options for react forms
 */
export type RenderOptions = {
  graphqlDir: string;
};

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
    private renderOptions: RenderOptions
  ) {}
  /**
   * reduces the dataSchema to a map of models
   */
  private getModelMapForDataSchema = (dataSchema: GenericDataSchema) => {
    return Object.entries(dataSchema.models).reduce<
      Record<string, Set<'create' | 'update'>>
    >((prev, [name, model]) => {
      if (!model.isJoinTable) {
        prev[name] = new Set(['create', 'update']);
      }
      return prev;
    }, {});
  };
  private generateBaseForms = (modelMap: {
    [model: string]: Set<'create' | 'update'>;
  }): StudioForm[] => {
    const getSchema = (
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

    const schemas: StudioForm[] = [];

    Object.entries(modelMap).forEach(([name, set]) => {
      set.forEach((type) => schemas.push(getSchema(name, type)));
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
  private codegenForm = (
    dataSchema: GenericDataSchema,
    formSchema: StudioForm
  ) => {
    return this.createUiBuilderForm(formSchema, dataSchema, {});
  };
  generateForms = async (): Promise<GraphqlGenerationResult> => {
    const dataSchema = await this.schemaFetcher();
    const modelMap = this.getModelMapForDataSchema(dataSchema);
    return new CodegenGraphqlFormGeneratorResult(
      this.generateBaseForms(modelMap).reduce<Record<string, string>>(
        (prev, formSchema) => {
          const result = this.codegenForm(dataSchema, formSchema);
          prev[result.fileName] = result.componentText;
          return prev;
        },
        {}
      )
    );
  };
}
