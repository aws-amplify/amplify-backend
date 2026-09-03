import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { once } from 'events';
import { ReadStream } from 'node:tty';
import { AmplifyPrompter, printer } from '@aws-amplify/cli-core';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import type { ValueKind } from '@aws-blocks/hosting';
import { HostingValueStore } from './hosting_value_store.js';

const KEY_REGEX = /^[a-zA-Z0-9_.-]+$/;

const assertValidKey = (key: string): void => {
  if (!KEY_REGEX.test(key)) {
    throw new AmplifyUserError('InvalidCommandInputError', {
      message: `Invalid key provided: ${key}`,
      resolution: 'Use a key that matches [a-zA-Z0-9_.-]+',
    });
  }
};

/**
 * Root command for a self-managed hosting value kind — `ampx secret <command>`
 * (AWS Secrets Manager) or `ampx config <command>` (SSM Parameter Store).
 */
export class HostingValueRootCommand implements CommandModule<object> {
  readonly command: string;
  readonly describe: string;

  /**
   * Create the root command for a value kind.
   * @param word - the top-level command word (`secret` or `config`).
   * @param describe - the command description.
   * @param subCommands - the set/get/list/remove subcommands.
   */
  constructor(
    word: 'secret' | 'config',
    describe: string,
    private readonly subCommands: CommandModule[],
  ) {
    this.command = `${word} <command>`;
    this.describe = describe;
  }

  handler = (): void => {
    // no-op for the non-terminal parent command.
  };

  builder = (yargs: Argv): Argv => yargs.command(this.subCommands).help();
}

type KeyArgs = { key: string; value?: string };

/**
 * `set <key> [value]` — create or overwrite a value. Secrets are read from a
 * hidden prompt or stdin (never argv); config accepts an inline `value`.
 */
export class HostingValueSetCommand implements CommandModule<object, KeyArgs> {
  readonly command = 'set <key> [value]';
  readonly describe: string;

  /**
   * Create the `set` command.
   * @param kind - the value kind this command sets.
   * @param store - the backing store.
   * @param readStream - stdin, for piped secret input.
   */
  constructor(
    private readonly kind: ValueKind,
    private readonly store: HostingValueStore,
    private readonly readStream: ReadStream = process.stdin,
  ) {
    this.describe =
      kind === 'secret'
        ? 'Set a hosting secret (AWS Secrets Manager)'
        : 'Set a hosting config value (SSM Parameter Store)';
  }

  handler = async (args: ArgumentsCamelCase<KeyArgs>): Promise<void> => {
    const value =
      this.kind === 'secret'
        ? await this.readSensitiveValue()
        : (args.value ??
          (await AmplifyPrompter.input({ message: 'Enter value' })));
    await this.store.setValue(args.key, value);
    printer.print(
      `Successfully set ${this.kind} '${args.key}' at ${this.store.locator(args.key)}`,
    );
  };

  builder = (yargs: Argv): Argv<KeyArgs> =>
    yargs
      .positional('key', {
        describe: 'Value key',
        type: 'string',
        demandOption: true,
      })
      .positional('value', {
        describe:
          this.kind === 'config'
            ? 'Value (omit to be prompted)'
            : 'Ignored for secrets — the value is read from a hidden prompt or stdin',
        type: 'string',
      })
      .check((argv) => {
        assertValidKey(String(argv.key));
        return true;
      }) as Argv<KeyArgs>;

  private readSensitiveValue = async (): Promise<string> => {
    if (this.readStream.isTTY) {
      return AmplifyPrompter.secretValue();
    }
    let value = '';
    this.readStream.on('readable', () => {
      const chunk = this.readStream.read();
      if (chunk !== null) value += chunk;
    });
    await once(this.readStream, 'end');
    return value.replace(/\n$/, '');
  };
}

/** `get <key>` — print a value (secrets print their plaintext; use with care). */
export class HostingValueGetCommand implements CommandModule<
  object,
  { key: string }
> {
  readonly command = 'get <key>';
  readonly describe: string;

  /**
   * Create the `get` command.
   * @param kind - the value kind.
   * @param store - the backing store.
   */
  constructor(
    private readonly kind: ValueKind,
    private readonly store: HostingValueStore,
  ) {
    this.describe = `Get a hosting ${kind} value`;
  }

  handler = async (
    args: ArgumentsCamelCase<{ key: string }>,
  ): Promise<void> => {
    assertValidKey(args.key);
    const value = await this.store.getValue(args.key);
    if (value === undefined) {
      throw new AmplifyUserError('SecretNotFoundError', {
        message: `No ${this.kind} named '${args.key}' is set.`,
        resolution: `Set it with 'ampx ${this.kind} set ${args.key}'.`,
      });
    }
    printer.print(value);
  };

  builder = (yargs: Argv): Argv<{ key: string }> =>
    yargs.positional('key', {
      describe: 'Value key',
      type: 'string',
      demandOption: true,
    }) as Argv<{ key: string }>;
}

/** `list` — print the keys set for this project (names only, never values). */
export class HostingValueListCommand implements CommandModule<object> {
  readonly command = 'list';
  readonly describe: string;

  /**
   * Create the `list` command.
   * @param kind - the value kind.
   * @param store - the backing store.
   */
  constructor(
    kind: ValueKind,
    private readonly store: HostingValueStore,
  ) {
    this.describe = `List hosting ${kind} keys`;
  }

  handler = async (): Promise<void> => {
    const keys = await this.store.listKeys();
    if (keys.length === 0) {
      printer.print('(none)');
      return;
    }
    keys.forEach((k) => printer.print(k));
  };

  builder = (yargs: Argv): Argv => yargs;
}

type RemoveArgs = { key: string; force?: boolean };

/** `remove <key>` — delete a value (confirmation-gated). */
export class HostingValueRemoveCommand implements CommandModule<
  object,
  RemoveArgs
> {
  readonly command = 'remove <key>';
  readonly describe: string;

  /**
   * Create the `remove` command.
   * @param kind - the value kind.
   * @param store - the backing store.
   */
  constructor(
    private readonly kind: ValueKind,
    private readonly store: HostingValueStore,
  ) {
    this.describe = `Remove a hosting ${kind} value`;
  }

  handler = async (args: ArgumentsCamelCase<RemoveArgs>): Promise<void> => {
    assertValidKey(args.key);
    // Deletion is destructive: SSM parameters have no recovery window, and a
    // secret starts a (recoverable) scheduled deletion. Gate on an explicit
    // confirmation unless --force is passed (for non-interactive/CI use).
    if (!args.force) {
      const confirmed = await AmplifyPrompter.yesOrNo({
        message: `Remove ${this.kind} '${args.key}'? This cannot be easily undone.`,
        defaultValue: false,
      });
      if (!confirmed) {
        printer.print('Aborted.');
        return;
      }
    }
    await this.store.removeKey(args.key);
    printer.print(`Successfully removed ${this.kind} '${args.key}'`);
  };

  builder = (yargs: Argv): Argv<RemoveArgs> =>
    yargs
      .positional('key', {
        describe: 'Value key',
        type: 'string',
        demandOption: true,
      })
      .option('force', {
        describe: 'Skip the confirmation prompt (for non-interactive use)',
        type: 'boolean',
        default: false,
      }) as Argv<RemoveArgs>;
}
