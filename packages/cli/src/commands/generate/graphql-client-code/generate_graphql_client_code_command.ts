import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { BackendIdentifierResolver } from '../../../backend-identifier/backend_identifier_resolver.js';
import { isAbsolute, resolve } from 'path';
import { GenerateApiCodeAdapter } from './generate_api_code_adapter.js';

export const formatChoices = ['graphql-codegen', 'introspection', 'modelgen'];
export const modelgenTargetChoices = [
  'java',
  'swift',
  'javascript',
  'typescript',
  'dart',
];
export const statementsTargetChoices = [
  'javascript',
  'graphql',
  'flow',
  'typescript',
  'angular',
];
export const typesTargetChoice = [
  'json',
  'swift',
  'ts',
  'typescript',
  'flow',
  'scala',
  'flow-modern',
  'angular',
];

export type GenerateGraphqlClientCodeCommandOptions = {
  stack: string | undefined;
  appId: string | undefined;
  branch: string | undefined;
  format: (typeof formatChoices)[number] | undefined;
  modelTarget: (typeof modelgenTargetChoices)[number] | undefined;
  statementTarget: (typeof statementsTargetChoices)[number] | undefined;
  typeTarget: (typeof typesTargetChoice)[number] | undefined;
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

  private readonly missingArgsError = new Error(
    'Either --stack or --branch must be provided'
  );

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
    args: ArgumentsCamelCase<GenerateGraphqlClientCodeCommandOptions>
  ): Record<string, string | boolean | number | undefined> => {
    switch (format) {
      case 'graphql-codegen':
        return {
          statementTarget: args.statementTarget ?? 'javascript',
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
          modelTarget: args.modelTarget ?? 'javascript',
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

  private getOutDir = (
    args: ArgumentsCamelCase<GenerateGraphqlClientCodeCommandOptions>
  ) => {
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
    args: ArgumentsCamelCase<GenerateGraphqlClientCodeCommandOptions>
  ): Promise<void> => {
    const backendIdentifier = await this.backendIdentifierResolver.resolve(
      args
    );
    const out = this.getOutDir(args);
    const format = args.format ?? ('graphql-codegen' as unknown as any);
    const formatParams = this.getFormatParams(format, args);

    const result = await this.generateApiCodeAdapter.invokeGenerateApiCode({
      ...backendIdentifier,
      format,
      ...formatParams,
    });

    await result.writeToDirectory(out);
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<GenerateGraphqlClientCodeCommandOptions> => {
    return yargs
      .option('stack', {
        conflicts: ['appId', 'branch'],
        describe: 'A stack name that contains an Amplify backend',
        type: 'string',
        array: false,
        group: 'Stack identifier',
      })
      .option('appId', {
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
        choices: formatChoices,
      })
      .option('modelTarget', {
        describe:
          'The modelgen export target. Only applies when the `--format` parameter is set to `modelgen`',
        type: 'string',
        array: false,
        choices: modelgenTargetChoices,
      })
      .option('statementTarget', {
        describe:
          'The graphql-codegen statement export target. Only applies when the `--format` parameter is set to `graphql-codegen`',
        type: 'string',
        array: false,
        choices: statementsTargetChoices,
      })
      .option('typeTarget', {
        describe:
          'The optional graphql-codegen type export target. Only applies when the `--format` parameter is set to `graphql-codegen`',
        type: 'string',
        array: false,
        choices: typesTargetChoice,
      })
      .option('modelGenerateIndexRules', {
        description: 'Adds key/index details to iOS models',
        type: 'boolean',
        array: false,
        hidden: true,
      })
      .option('modelEmitAuthProvider', {
        description: 'Adds auth provider details to iOS models',
        type: 'boolean',
        array: false,
        hidden: true,
      })
      .option('modelRespectPrimaryKeyAttributesOnConnectionField', {
        description:
          'If enabled, datastore queries will respect the primary + sort key fields, rather than a defaut id field',
        type: 'boolean',
        array: false,
        hidden: true,
      })
      .option('modelGenerateModelsForLazyLoadAndCustomSelectionSet', {
        description:
          'Generates lazy model type definitions, required or amplify-js v5+',
        type: 'boolean',
        array: false,
        hidden: true,
      })
      .option('modelAddTimestampFields', {
        description: 'Add read-only timestamp fields in modelgen.',
        type: 'boolean',
        array: false,
        hidden: true,
      })
      .option('modelHandleListNullabilityTransparently', {
        description:
          'Configure the nullability of the List and List components in Datastore Models generation',
        type: 'boolean',
        array: false,
        hidden: true,
      })
      .option('statementMaxDepth', {
        description:
          'Determines how deeply nested to generate graphql statements.',
        type: 'number',
        array: false,
        hidden: true,
      })
      .option('statementTypenameIntrospection', {
        description:
          'Determines whether to include default __typename for all generated statements',
        type: 'boolean',
        array: false,
        hidden: true,
      })
      .option('typeMultipleSwiftFiles', {
        description:
          'Determines whether or not to generate a single API.swift, or multiple per-model swift files.',
        type: 'boolean',
        array: false,
        hidden: true,
      })
      .showHidden('all')
      .check((argv) => {
        if (!argv.stack && !argv.branch) {
          throw this.missingArgsError;
        }
        return true;
      });
  };
}
