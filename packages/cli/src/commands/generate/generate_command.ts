import { Argv, CommandModule } from 'yargs';
import { GenerateOutputsCommand } from './outputs/generate_outputs_command.js';
import { GenerateFormsCommand } from './forms/generate_forms_command.js';
import { GenerateGraphqlClientCodeCommand } from './graphql-client-code/generate_graphql_client_code_command.js';
import { CommandMiddleware } from '../../command_middleware.js';
import { GenerateSchemaCommand } from './schema-from-database/generate_schema_command.js';

/**
 * An entry point for generate command.
 */
export class GenerateCommand implements CommandModule {
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  /**
   * Creates top level entry point for generate command.
   */
  constructor(
    private readonly generateOutputsCommand: GenerateOutputsCommand,
    private readonly generateFormsCommand: GenerateFormsCommand,
    private readonly generateGraphqlClientCodeCommand: GenerateGraphqlClientCodeCommand,
    private readonly generateSchemaCommand: GenerateSchemaCommand,
    private readonly commandMiddleware: CommandMiddleware
  ) {
    this.command = 'generate';
    this.describe = 'Generates post deployment artifacts';
  }

  /**
   * @inheritDoc
   */
  handler = (): void | Promise<void> => {
    // CommandModule requires handler implementation. But this is never called if top level command
    // is configured to require subcommand.
    // Help is printed by default in that case before ever attempting to call handler.
    throw new Error('Top level generate handler should never be called');
  };

  builder = (yargs: Argv): Argv => {
    return (
      yargs
        .version(false)
        // Cast to erase options types used in internal sub command implementation. Otherwise, compiler fails here.
        .command(this.generateOutputsCommand as unknown as CommandModule)
        .command(this.generateFormsCommand as unknown as CommandModule)
        .command(
          this.generateGraphqlClientCodeCommand as unknown as CommandModule
        )
        .command(this.generateSchemaCommand as unknown as CommandModule)
        .demandCommand()
        .strictCommands()
        .recommendCommands()
        .option('profile', {
          describe: 'An AWS profile name.',
          type: 'string',
          array: false,
        })
        .middleware([this.commandMiddleware.ensureAwsCredentialAndRegion])
    );
  };
}
