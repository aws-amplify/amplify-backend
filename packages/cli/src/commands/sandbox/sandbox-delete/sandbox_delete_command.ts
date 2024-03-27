import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { SandboxSingletonFactory } from '@aws-amplify/sandbox';
import { AmplifyPrompter } from '@aws-amplify/cli-core';
import { SandboxCommandGlobalOptions } from '../option_types.js';
import { ArgumentsKebabCase } from '../../../kebab_case.js';

/**
 * Command that deletes the sandbox environment.
 */
export class SandboxDeleteCommand
  implements CommandModule<object, SandboxDeleteCommandOptionsKebabCase>
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
   * Deletes sandbox environment.
   */
  constructor(private readonly sandboxFactory: SandboxSingletonFactory) {
    this.command = 'delete';
    this.describe = 'Deletes sandbox environment';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<SandboxDeleteCommandOptionsKebabCase>
  ): Promise<void> => {
    let isConfirmed = args.yes;
    if (!isConfirmed) {
      isConfirmed = await AmplifyPrompter.yesOrNo({
        message:
          "Are you sure you want to delete all the resources in your sandbox environment (This can't be undone)?",
      });
    }

    if (isConfirmed) {
      await (
        await this.sandboxFactory.getInstance()
      ).delete({ name: args.name });
    }
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<SandboxDeleteCommandOptionsKebabCase> => {
    return yargs.option('yes', {
      describe:
        'Do not ask for confirmation before deleting the sandbox environment',
      type: 'boolean',
      array: false,
      alias: 'y',
    });
  };
}

type SandboxDeleteCommandOptionsKebabCase = ArgumentsKebabCase<
  {
    yes?: boolean;
  } & SandboxCommandGlobalOptions
>;
