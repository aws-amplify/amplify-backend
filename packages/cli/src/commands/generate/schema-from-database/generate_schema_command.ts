import { Argv, CommandModule } from 'yargs';
import { BackendIdentifierResolver } from '../../../backend-identifier/backend_identifier_resolver.js';
import { ArgumentsKebabCase } from '../../../kebab_case.js';
import { SecretClient } from '@aws-amplify/backend-secret';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { SchemaGenerator } from '@aws-amplify/schema-generator';

const DEFAULT_OUTPUT = 'schema.sql.ts';

export type GenerateSchemaCommandOptions =
  ArgumentsKebabCase<GenerateSchemaCommandOptionsCamelCase>;

type GenerateSchemaCommandOptionsCamelCase = {
  stack: string | undefined;
  appId: string | undefined;
  branch: string | undefined;
  out: string | undefined;
  connectionString: string | undefined;
};

/**
 * Command that generates client config.
 */
export class GenerateSchemaCommand
  implements CommandModule<object, GenerateSchemaCommandOptions>
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
   * Creates client config generation command.
   */
  constructor(
    private readonly backendIdentifierResolver: BackendIdentifierResolver,
    private readonly secretClient: SecretClient
  ) {
    this.command = 'schema-from-database';
    this.describe = 'Generates typescript data schema from database';
  }

  getBackendIdentifier = async (args: GenerateSchemaCommandOptions) => {
    return await this.backendIdentifierResolver.resolve(args);
  };

  /**
   * @inheritDoc
   */
  handler = async (args: GenerateSchemaCommandOptions): Promise<void> => {
    const backendIdentifier = await this.backendIdentifierResolver.resolve(
      args
    );

    if (!backendIdentifier) {
      throw new Error('Could not resolve the backend identifier');
    }

    const secretName = args['connection-string'] as string;
    const outputFile = args['out'] as string;

    const connectionString = await this.secretClient.getSecret(
      backendIdentifier as BackendIdentifier,
      {
        name: secretName,
      }
    );

    const schemaGenerator = new SchemaGenerator();
    await schemaGenerator.generate({
      connectionString: connectionString.value,
      out: outputFile,
    });
    // const backendOutputClient = this.backendOutputClientBuilder();

    // const output = await backendOutputClient.getOutput(backendIdentifier);

    // if (!(graphqlOutputKey in output) || !output[graphqlOutputKey]) {
    //   throw new Error('No GraphQL API configured for this backend.');
    // }

    // const apiUrl = output[graphqlOutputKey].payload.amplifyApiModelSchemaS3Uri;

    // if (!args['out-dir']) {
    //   throw new Error('out-dir must be defined');
    // }

    // const outDir = args['out-dir'];

    // await this.formGenerationHandler.generate({
    //   modelsOutDir: path.join(outDir, 'graphql'),
    //   backendIdentifier,
    //   uiOutDir: outDir,
    //   apiUrl,
    //   modelsFilter: args.models,
    // });
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<GenerateSchemaCommandOptions> => {
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
        implies: 'appId',
      })
      .option('out', {
        describe: 'A path to directory where generated schema is written.',
        default: DEFAULT_OUTPUT,
        type: 'string',
        array: false,
        group: 'Schema Generation',
      })
      .option('connection-string', {
        describe: 'Secret name for the database connection string',
        type: 'string',
        array: false,
        group: 'Schema Generation',
      });
  };
}
