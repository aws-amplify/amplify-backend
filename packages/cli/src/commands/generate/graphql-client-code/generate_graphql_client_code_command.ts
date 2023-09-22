import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { BackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { AppNameResolver } from '../../../local_app_name_resolver.js';
import { GraphqlClientCodeGeneratorAdapter } from './generate_graphql_client_code_generator_adapter.js';
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
    private readonly graphqlClientCodeGeneratorAdapter: GraphqlClientCodeGeneratorAdapter,
    private readonly appNameResolver: AppNameResolver
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
    const backendIdentifierParts = await this.getBackendIdentifier(args);
    const out = this.getOutDir(args);
    const format = args.format ?? ('graphql-codegen' as unknown as any);
    const targetParts = this.getTargetParts(format, args);

    await this.graphqlClientCodeGeneratorAdapter.generateGraphqlClientCodeToFile(
      {
        ...backendIdentifierParts,
        out,
        format,
        ...targetParts,
      }
    );
  };

  /**
   * Translates args to BackendIdentifier.
   * Throws if translation can't be made (this should never happen if command validation works correctly).
   */
  private getBackendIdentifier = async (
    args: ArgumentsCamelCase<GenerateGraphqlClientCodeCommandOptions>
  ): Promise<BackendIdentifier> => {
    if (args.stack) {
      return { stackName: args.stack };
    } else if (args.appId && args.branch) {
      return { backendId: args.appId, branchName: args.branch };
    } else if (args.branch) {
      return {
        appName: await this.appNameResolver.resolve(),
        branchName: args.branch,
      };
    }
    throw this.missingArgsError;
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
        describe: 'TK',
        type: 'string',
        array: false,
        choices: modelgenTargetChoices,
      })
      .option('statementTarget', {
        describe: 'TK',
        type: 'string',
        array: false,
        choices: statementsTargetChoices,
      })
      .option('typeTarget', {
        describe: 'TK',
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
