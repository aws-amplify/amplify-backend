import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { BackendIdentifierResolver } from '../../../backend-identifier/backend_identifier_resolver.js';
import { ApiCodeGenerator } from './mock_code_generator.js';
import { isAbsolute, resolve } from 'path';

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
    private readonly apiCodeGenerator: ApiCodeGenerator,
    private readonly backendIdentifierResolver: BackendIdentifierResolver
  ) {
    this.command = 'graphql-client-code';
    this.describe = 'Generates graphql API code';
  }

  private getTargetParts = (
    format: string,
    args: ArgumentsCamelCase<GenerateGraphqlClientCodeCommandOptions>
  ): Record<string, string | undefined> => {
    switch (format) {
      case 'graphql-codegen':
        return {
          statementTarget: args.statementTarget ?? 'javascript',
          ...(args.typeTarget ? { typeTarget: args.typeTarget } : {}),
        };
      case 'modelgen':
        return {
          modelTarget: args.modelTarget ?? 'javascript',
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
    const targetParts = this.getTargetParts(format, args);

    await this.apiCodeGenerator.generateAPICodeToFile({
      backendIdentifier,
      out,
      format,
      ...targetParts,
    });
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
      .check((argv) => {
        if (!argv.stack && !argv.branch) {
          throw this.missingArgsError;
        }
        return true;
      });
  };
}
