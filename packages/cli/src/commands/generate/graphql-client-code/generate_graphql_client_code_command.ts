import { Argv, CommandModule } from 'yargs';
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
  GenerateModelsOptions,
} from '@aws-amplify/model-generator';
import { ArgumentsKebabCase } from '../../../kebab_case.js';

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

  private getFormatParams = (
    format: string,
    args: GenerateGraphqlClientCodeCommandOptions
  ):
    | object
    | Pick<
        ArgumentsKebabCase<GenerateGraphqlCodegenOptions>,
        | 'statement-target'
        | 'type-target'
        | 'max-depth'
        | 'multiple-swift-files'
      >
    | Pick<
        ArgumentsKebabCase<GenerateModelsOptions>,
        'model-target' | 'generate-index-rules'
      > => {
    switch (format) {
      case 'graphql-codegen':
        return {
          statementTarget: args['statement-target'] ?? 'javascript',
          ...('typeTarget' in args ? { typeTarget: args.typeTarget } : {}),
          ...('statementMaxDepth' in args
            ? { maxDepth: args.statementMaxDepth }
            : {}),
          ...('statementTypenameIntrospection' in args
            ? { typenameIntrospection: args.statementTypenameIntrospection }
            : {}),
          ...('typeMultipleSwiftFiles' in args
            ? { multipleSwiftFiles: args.typeMultipleSwiftFiles }
            : {}),
        };
      case 'modelgen':
        return {
          modelTarget: args['model-target'] ?? 'javascript',
          ...('modelGenerateIndexRules' in args
            ? { generateIndexRules: args.modelGenerateIndexRules }
            : {}),
          ...('modelEmitAuthProvider' in args
            ? { emitAuthProvider: args.modelEmitAuthProvider }
            : {}),
          ...('modelRespectPrimaryKeyAttributesOnConnectionField' in args
            ? {
                respectPrimaryKeyAttributesOnConnectionField:
                  args.modelRespectPrimaryKeyAttributesOnConnectionField,
              }
            : {}),
          ...('modelGenerateModelsForLazyLoadAndCustomSelectionSet' in args
            ? {
                generateModelsForLazyLoadAndCustomSelectionSet:
                  args.modelGenerateModelsForLazyLoadAndCustomSelectionSet,
              }
            : {}),
          ...('modelAddTimestampFields' in args
            ? { addTimestampFields: args.modelAddTimestampFields }
            : {}),
          ...('modelHandleListNullabilityTransparently' in args
            ? {
                handleListNullabilityTransparently:
                  args.modelHandleListNullabilityTransparently,
              }
            : {}),
        };
      case 'introspection':
        return {};
      default:
        throw new Error(`Unexpected format ${format} received`);
    }
  };

  private getOutDir = (args: GenerateGraphqlClientCodeCommandOptions) => {
    const cwd = process.cwd();
    if (!args.out) {
      return cwd;
    }
    return isAbsolute(args.out) ? args.out : resolve(cwd, args.out);
  };

  /**
   * @inheritDoc
   */
  handler = async (
    args: GenerateGraphqlClientCodeCommandOptions
  ): Promise<void> => {
    const backendIdentifier = await this.backendIdentifierResolver.resolve(
      args
    );
    const out = this.getOutDir(args);
    const format = args.format ?? 'graphql-codegen';
    const formatParams = this.getFormatParams(format, args);

    const result = await this.generateApiCodeAdapter.invokeGenerateApiCode({
      ...backendIdentifier,
      format,
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
      .showHidden('all')
      .check((argv) => {
        if (!argv.stack && !argv.branch) {
          throw new Error('Either --stack or --branch must be provided');
        }
        return true;
      });
  };
}
