import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { BackendIdentifierResolver } from '../../../backend-identifier/backend_identifier_resolver.js';
import { ArgumentsKebabCase } from '../../../kebab_case.js';
import { SecretClient } from '@aws-amplify/backend-secret';
import { SchemaGenerator } from '@aws-amplify/schema-generator';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { generateProviderCode } from './provider_code_generator.js';
import { printer } from '@aws-amplify/cli-core';

const DEFAULT_OUTPUT = 'amplify/data/schema.sql.ts';

export type GenerateSchemaCommandOptions =
  ArgumentsKebabCase<GenerateSchemaCommandOptionsCamelCase>;

type GenerateSchemaCommandOptionsCamelCase = {
  stack: string | undefined;
  appId: string | undefined;
  branch: string | undefined;
  out: string | undefined;
  connectionUriSecret: string | undefined;
  sslCertSecret: string | undefined;
  provider: 'aurora' | 'rds' | undefined;
  auroraProvision: boolean | undefined;
};

/**
 * Command that generates typescript data schema from sql schema.
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
   * Creates typescript data schema generation command.
   */
  constructor(
    private readonly backendIdentifierResolver: BackendIdentifierResolver,
    private readonly secretClient: SecretClient,
    private readonly schemaGenerator: SchemaGenerator,
  ) {
    this.command = 'schema-from-database';
    this.describe = 'Generates typescript data schema from a SQL database';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<GenerateSchemaCommandOptions>,
  ): Promise<void> => {
    const backendIdentifier =
      await this.backendIdentifierResolver.resolveBackendIdentifier(args);

    if (!backendIdentifier) {
      throw new AmplifyUserError('BackendIdentifierResolverError', {
        message: 'Could not resolve the backend identifier.',
        resolution:
          'Ensure stack name or Amplify App ID and branch specified are correct and exists, then re-run this command.',
      });
    }

    const connectionUriSecretName = args.connectionUriSecret as string;
    const outputFile = args.out as string;

    const connectionUriSecret = await this.secretClient.getSecret(
      backendIdentifier,
      {
        name: connectionUriSecretName,
      },
    );

    const sslCertSecretName = args.sslCertSecret as string;
    let sslCertSecret;
    if (sslCertSecretName) {
      sslCertSecret = await this.secretClient.getSecret(backendIdentifier, {
        name: sslCertSecretName,
      });
    }

    await this.schemaGenerator.generate({
      connectionUri: {
        secretName: connectionUriSecretName,
        value: connectionUriSecret.value,
      },
      ...(sslCertSecret && {
        sslCert: {
          secretName: sslCertSecretName,
          value: sslCertSecret.value,
        },
      }),
      out: outputFile,
    });

    // Generate provider configuration if specified
    if (args.provider) {
      const providerCode = generateProviderCode({
        provider: args.provider as 'aurora' | 'rds',
        connectionUriSecret: connectionUriSecretName,
        auroraProvision: args.auroraProvision,
      });

      if (providerCode) {
        printer.log('');
        printer.log('Provider configuration:');
        printer.log(providerCode);
        printer.log('');
        printer.log(
          `Add this to your amplify/data/resource.ts file to use the ${args.provider} provider.`,
        );
      }
    }
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
        implies: 'app-id',
      })
      .option('out', {
        describe: 'A path to directory where generated schema is written.',
        default: DEFAULT_OUTPUT,
        type: 'string',
        array: false,
        group: 'Schema Generation',
      })
      .option('connection-uri-secret', {
        describe: 'Amplify secret name for the database connection uri',
        type: 'string',
        array: false,
        group: 'Schema Generation',
        demandOption: true,
      })
      .option('ssl-cert-secret', {
        describe: 'Amplify secret name for the ssl certificate',
        type: 'string',
        array: false,
        group: 'Schema Generation',
        demandOption: false,
      })
      .option('provider', {
        describe: 'Database provider type (aurora or rds)',
        type: 'string',
        array: false,
        choices: ['aurora', 'rds'] as const,
        group: 'Provider Configuration',
      })
      .option('aurora-provision', {
        describe: 'Generate code to provision Aurora Serverless v2',
        type: 'boolean',
        array: false,
        group: 'Provider Configuration',
      })
      .example(
        '$0 generate schema-from-database --connection-uri-secret DB_URI --provider aurora --aurora-provision',
        'Generate schema with Aurora provisioning',
      ) as Argv<GenerateSchemaCommandOptions>;
  };
}
