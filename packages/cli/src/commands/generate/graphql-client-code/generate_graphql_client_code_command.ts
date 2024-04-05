import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { BackendIdentifierResolver } from '../../../backend-identifier/backend_identifier_resolver.js';
import { isAbsolute, resolve } from 'path';
import {
  GenerateApiCodeAdapter,
  InvokeGenerateApiCodeProps,
} from './generate_api_code_adapter.js';
import {
  GenerateApiCodeFormat,
  GenerateApiCodeModelTarget,
  GenerateApiCodeStatementTarget,
  GenerateApiCodeTypeTarget,
  GenerateGraphqlCodegenOptions,
  GenerateIntrospectionOptions,
  GenerateModelsOptions,
} from '@aws-amplify/model-generator';
import { ArgumentsKebabCase } from '../../../kebab_case.js';

type GenerateOptions =
  | GenerateGraphqlCodegenOptions
  | GenerateModelsOptions
  | GenerateIntrospectionOptions;

export type GenerateGraphqlClientCodeCommandOptions =
  ArgumentsKebabCase<GenerateGraphqlClientCodeCommandOptionsCamelCase>;

type GenerateGraphqlClientCodeCommandOptionsCamelCase = {
  stack: string | undefined;
  appId: string | undefined;
  branch: string | undefined;
  format: GenerateApiCodeFormat | undefined;
  modelTarget: GenerateApiCodeModelTarget | undefined;
  statementTarget: GenerateApiCodeStatementTarget | undefined;
  typeTarget: GenerateApiCodeTypeTarget | undefined;
  out: string | undefined;
  modelGenerateIndexRules: boolean | undefined;
  modelEmitAuthProvider: boolean | undefined;
  modelRespectPrimaryKeyAttributesOnConnectionField: boolean | undefined;
  modelGenerateModelsForLazyLoadAndCustomSelectionSet: boolean | undefined;
  modelAddTimestampFields: boolean | undefined;
  modelHandleListNullabilityTransparently: boolean | undefined;
  statementMaxDepth: number | undefined;
  statementTypenameIntrospection: boolean | undefined;
  typeMultipleSwiftFiles: boolean | undefined;
};

const DEFAULT_TYPE_TARGET_FOR_STATEMENT_TARGET: Record<
  GenerateApiCodeStatementTarget,
  GenerateApiCodeTypeTarget | undefined
> = {
  [GenerateApiCodeStatementTarget.JAVASCRIPT]: undefined,
  [GenerateApiCodeStatementTarget.TYPESCRIPT]:
    GenerateApiCodeTypeTarget.TYPESCRIPT,
  [GenerateApiCodeStatementTarget.GRAPHQL]: undefined,
  [GenerateApiCodeStatementTarget.FLOW]: GenerateApiCodeTypeTarget.FLOW,
  [GenerateApiCodeStatementTarget.ANGULAR]: GenerateApiCodeTypeTarget.ANGULAR,
};

/**
 * Command that generates client config.
 */
export class GenerateGraphqlClientCodeCommand
  implements CommandModule<object, GenerateGraphqlClientCodeCommandOptions>
{
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  /**
   * Creates graphql client code generation command.
   */
  constructor(
    private readonly generateApiCodeAdapter: GenerateApiCodeAdapter,
    private readonly backendIdentifierResolver: BackendIdentifierResolver
  ) {
    this.command = 'graphql-client-code';
    this.describe = 'Generates graphql API code';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<GenerateGraphqlClientCodeCommandOptions>
  ): Promise<void> => {
    const backendIdentifier = await this.backendIdentifierResolver.resolve(
      args
    );
    const out = this.getOutDir(args);
    const format = args.format ?? GenerateApiCodeFormat.GRAPHQL_CODEGEN;
    const formatParams = this.formatParamBuilders[format](args);

    const result = await this.generateApiCodeAdapter.invokeGenerateApiCode({
      ...backendIdentifier,
      ...formatParams,
    } as unknown as InvokeGenerateApiCodeProps);

    await result.writeToDirectory(out);
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<GenerateGraphqlClientCodeCommandOptions> => {
    return yargs
      .option('stack', {
        conflicts: ['app-id', 'branch'],
        describe: 'A stack name that contains an Amplify backend',
        type: 'string',
        array: false,
        group: 'Stack identifier',
      })
      .option('app-id', {
        conflicts: ['stack'],
        describe: 'The Amplify App ID of the project',
        type: 'string',
        array: false,
        implies: 'branch',
        group: 'Project identifier',
      })
      .option('branch', {
        conflicts: ['stack'],
        describe: 'A git branch of the Amplify project',
        type: 'string',
        array: false,
        group: 'Project identifier',
      })
      .option('out', {
        describe:
          'A path to directory where config is written. If not provided defaults to current process working directory.',
        type: 'string',
        array: false,
      })
      .option('format', {
        describe:
          'The format that the GraphQL client code should be generated in.',
        type: 'string',
        array: false,
        choices: Object.values(GenerateApiCodeFormat),
      })
      .option('model-target', {
        describe:
          'The modelgen export target. Only applies when the `--format` parameter is set to `modelgen`',
        type: 'string',
        array: false,
        choices: Object.values(GenerateApiCodeModelTarget),
      })
      .option('statement-target', {
        describe:
          'The graphql-codegen statement export target. Only applies when the `--format` parameter is set to `graphql-codegen`',
        type: 'string',
        array: false,
        choices: Object.values(GenerateApiCodeStatementTarget),
      })
      .option('type-target', {
        describe:
          'The optional graphql-codegen type export target. Only applies when the `--format` parameter is set to `graphql-codegen`',
        type: 'string',
        array: false,
        choices: Object.values(GenerateApiCodeTypeTarget),
      })
      .option('model-generate-index-rules', {
        description: 'Adds key/index details to iOS models',
        type: 'boolean',
        array: false,
        hidden: true,
      })
      .option('model-emit-auth-provider', {
        description: 'Adds auth provider details to iOS models',
        type: 'boolean',
        array: false,
        hidden: true,
      })
      .option('model-respect-primary-key-attributes-on-connection-field', {
        description:
          'If enabled, Datastore queries will respect the primary + sort key fields, rather than a default id field',
        type: 'boolean',
        array: false,
        hidden: true,
      })
      .option('model-generate-models-for-lazy-load-and-custom-selection-set', {
        description:
          'Generates lazy model type definitions, required or amplify-js v5+',
        type: 'boolean',
        array: false,
        hidden: true,
      })
      .option('model-add-timestamp-fields', {
        description: 'Add read-only timestamp fields in modelgen.',
        type: 'boolean',
        array: false,
        hidden: true,
      })
      .option('model-handle-list-nullability-transparently', {
        description:
          'Configure the nullability of the List and List components in Datastore Models generation',
        type: 'boolean',
        array: false,
        hidden: true,
      })
      .option('statement-max-depth', {
        description:
          'Determines how deeply nested to generate graphql statements.',
        type: 'number',
        array: false,
        hidden: true,
      })
      .option('statement-typename-introspection', {
        description:
          'Determines whether to include default __typename for all generated statements',
        type: 'boolean',
        array: false,
        hidden: true,
      })
      .option('type-multiple-swift-files', {
        description:
          'Determines whether or not to generate a single API.swift, or multiple per-model swift files.',
        type: 'boolean',
        array: false,
        hidden: true,
      })
      .showHidden('all');
  };

  /**
   * Produce the required input for graphql-codegen calls from the CLI input, applying sane defaults where applicable.
   * @param args CLI args provided by the customer
   * @returns the codegen options config
   */
  private getGraphqlCodegenFormatParams = (
    args: GenerateGraphqlClientCodeCommandOptions
  ): GenerateGraphqlCodegenOptions => {
    const statementTarget: GenerateApiCodeStatementTarget =
      args['statement-target'] ?? GenerateApiCodeStatementTarget.TYPESCRIPT;
    const typeTarget: GenerateApiCodeTypeTarget | undefined =
      args['type-target'] ??
      DEFAULT_TYPE_TARGET_FOR_STATEMENT_TARGET[statementTarget];
    const maxDepth: number | undefined = args['statement-max-depth'];
    const typeNameIntrospection: boolean | undefined =
      args['statement-typename-introspection'];
    const multipleSwiftFiles: boolean | undefined =
      args['type-multiple-swift-files'];

    return {
      format: GenerateApiCodeFormat.GRAPHQL_CODEGEN,
      statementTarget,
      ...(typeTarget !== undefined ? { typeTarget } : {}),
      ...(maxDepth !== undefined ? { maxDepth } : {}),
      ...(typeNameIntrospection !== undefined ? { typeNameIntrospection } : {}),
      ...(multipleSwiftFiles !== undefined ? { multipleSwiftFiles } : {}),
    };
  };

  /**
   * Produce the required input for modelgen calls from the CLI input, applying sane defaults where applicable.
   * @param args CLI args provided by the customer
   * @returns the modelgen options config
   */
  private getModelgenFormatParams = (
    args: GenerateGraphqlClientCodeCommandOptions
  ): GenerateModelsOptions => {
    const modelTarget: GenerateApiCodeModelTarget =
      args['model-target'] ?? GenerateApiCodeModelTarget.TYPESCRIPT;
    const generateIndexRules: boolean | undefined =
      args['model-generate-index-rules'];
    const emitAuthProvider: boolean | undefined =
      args['model-emit-auth-provider'];
    const respectPrimaryKeyAttributesOnConnectionField: boolean | undefined =
      args['model-respect-primary-key-attributes-on-connection-field'];
    const generateModelsForLazyLoadAndCustomSelectionSet: boolean | undefined =
      args['model-generate-models-for-lazy-load-and-custom-selection-set'];
    const addTimestampFields: boolean | undefined =
      args['model-add-timestamp-fields'];
    const handleListNullabilityTransparently: boolean | undefined =
      args['model-handle-list-nullability-transparently'];

    return {
      format: GenerateApiCodeFormat.MODELGEN,
      modelTarget,
      ...(generateIndexRules !== undefined ? { generateIndexRules } : {}),
      ...(emitAuthProvider !== undefined ? { emitAuthProvider } : {}),
      ...(respectPrimaryKeyAttributesOnConnectionField !== undefined
        ? { respectPrimaryKeyAttributesOnConnectionField }
        : {}),
      ...(generateModelsForLazyLoadAndCustomSelectionSet !== undefined
        ? { generateModelsForLazyLoadAndCustomSelectionSet }
        : {}),
      ...(addTimestampFields !== undefined ? { addTimestampFields } : {}),
      ...(handleListNullabilityTransparently !== undefined
        ? { handleListNullabilityTransparently }
        : {}),
    };
  };

  /**
   * Produce the introspection schema config shape.
   * @returns the introspection options config
   */
  private getIntrospectionFormatParams = (): GenerateIntrospectionOptions => ({
    format: GenerateApiCodeFormat.INTROSPECTION,
  });

  private getOutDir = (args: GenerateGraphqlClientCodeCommandOptions) => {
    const cwd = process.cwd();
    if (!args.out) {
      return cwd;
    }
    return isAbsolute(args.out) ? args.out : resolve(cwd, args.out);
  };

  // This property references other methods in the class so it must be defined at the end.
  // This is probably an indicator that some refactoring should happen here but right now I'm just trying to apply this lint rule to the codebase
  // eslint-disable-next-line @typescript-eslint/member-ordering
  private formatParamBuilders: Record<
    GenerateApiCodeFormat,
    (args: GenerateGraphqlClientCodeCommandOptions) => GenerateOptions
  > = {
    [GenerateApiCodeFormat.MODELGEN]: this.getModelgenFormatParams,
    [GenerateApiCodeFormat.GRAPHQL_CODEGEN]: this.getGraphqlCodegenFormatParams,
    [GenerateApiCodeFormat.INTROSPECTION]: this.getIntrospectionFormatParams,
  };
}
