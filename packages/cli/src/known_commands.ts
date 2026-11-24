/**
 * A command known to the CLI parser, along with the option names it declares.
 */
export type KnownCommand = {
  /**
   * Option and positional argument names declared by this command, as declared (kebab-case),
   * including short aliases. Options declared by parent commands also apply to their subcommands.
   */
  readonly options?: readonly string[];
  readonly subCommands?: Readonly<Record<string, KnownCommand>>;
};

/**
 * The command tree registered in main_parser_factory.ts.
 *
 * Telemetry only records command names and option names that appear here.
 * Keep this in sync with the registered commands; known_commands.test.ts fails if they differ.
 */
export const knownCommands: KnownCommand = {
  options: ['debug', 'help', 'version', 'h', 'v'],
  subCommands: {
    generate: {
      options: ['profile'],
      subCommands: {
        outputs: {
          options: [
            'stack',
            'app-id',
            'branch',
            'format',
            'out-dir',
            'outputs-version',
          ],
        },
        forms: {
          options: ['stack', 'app-id', 'branch', 'out-dir', 'models'],
        },
        'graphql-client-code': {
          options: [
            'stack',
            'app-id',
            'branch',
            'out',
            'format',
            'model-target',
            'statement-target',
            'type-target',
            'model-generate-index-rules',
            'model-emit-auth-provider',
            'model-respect-primary-key-attributes-on-connection-field',
            'model-generate-models-for-lazy-load-and-custom-selection-set',
            'model-add-timestamp-fields',
            'model-handle-list-nullability-transparently',
            'statement-max-depth',
            'statement-typename-introspection',
            'type-multiple-swift-files',
          ],
        },
        'schema-from-database': {
          options: [
            'stack',
            'app-id',
            'branch',
            'out',
            'connection-uri-secret',
            'ssl-cert-secret',
          ],
        },
      },
    },
    sandbox: {
      options: [
        'dir-to-watch',
        'exclude',
        'identifier',
        'outputs-format',
        'outputs-version',
        'outputs-out-dir',
        'profile',
        'once',
        'express',
        'stream-function-logs',
        'logs-filter',
        'logs-out-file',
      ],
      subCommands: {
        delete: { options: ['yes', 'y'] },
        secret: {
          options: ['command'],
          subCommands: {
            set: { options: ['secret-name'] },
            remove: { options: ['all', 'secret-name'] },
            get: { options: ['secret-name'] },
            list: {},
          },
        },
        seed: {
          subCommands: {
            'generate-policy': {},
          },
        },
      },
    },
    'pipeline-deploy': {
      options: [
        'branch',
        'app-id',
        'outputs-out-dir',
        'outputs-version',
        'outputs-format',
      ],
    },
    deploy: {
      options: [
        'identifier',
        'outputs-out-dir',
        'outputs-version',
        'outputs-format',
        'profile',
        'backend',
        'frontend',
        'pipeline',
        'yes',
        'y',
      ],
    },
    configure: {
      options: ['command'],
      subCommands: {
        profile: { options: ['name'] },
        telemetry: {
          subCommands: {
            enable: {},
            disable: {},
          },
        },
      },
    },
    info: {},
    notices: {
      subCommands: {
        list: { options: ['all'] },
        acknowledge: { options: ['notice-id'] },
      },
    },
    secret: {
      options: ['command'],
      subCommands: {
        set: { options: ['key', 'value'] },
        get: { options: ['key'] },
        list: {},
        remove: { options: ['key', 'force'] },
      },
    },
    config: {
      options: ['command'],
      subCommands: {
        set: { options: ['key', 'value'] },
        get: { options: ['key'] },
        list: {},
        remove: { options: ['key', 'force'] },
      },
    },
  },
};

/**
 * Recorded in place of each unrecognized positional argument.
 */
export const unknownArgumentPlaceholder = '<unknown>';

export type ResolvedKnownCommand = {
  /**
   * Leading positional arguments that match known commands, in order.
   * Unrecognized arguments are recorded as a placeholder.
   */
  path: string[];
  /**
   * Option names declared by the root and every command in the path,
   * in both kebab-case and camelCase forms.
   */
  declaredOptions: ReadonlySet<string>;
};

/**
 * Matches leading positional arguments (for example yargs `argv._`) against the known command tree.
 *
 * Matching stops at the first argument that is not a known subcommand of the previously matched command.
 * That argument and every argument after it are recorded as a placeholder.
 */
export const resolveKnownCommand = (
  positionalArgs: ReadonlyArray<string | number>,
  root: KnownCommand = knownCommands,
): ResolvedKnownCommand => {
  const path: string[] = [];
  const declaredOptions = new Set<string>();
  addOptions(declaredOptions, root);

  let current: KnownCommand | undefined = root;
  for (const arg of positionalArgs) {
    current = current && getSubCommand(current, String(arg));
    if (!current) {
      path.push(unknownArgumentPlaceholder);
      continue;
    }
    path.push(String(arg));
    addOptions(declaredOptions, current);
  }

  return { path, declaredOptions };
};

const getSubCommand = (
  command: KnownCommand,
  name: string,
): KnownCommand | undefined => {
  // own-property check so that names such as 'constructor' or '__proto__' never match
  if (
    command.subCommands &&
    Object.prototype.hasOwnProperty.call(command.subCommands, name)
  ) {
    return command.subCommands[name];
  }
  return undefined;
};

const addOptions = (target: Set<string>, command: KnownCommand) => {
  for (const option of command.options ?? []) {
    target.add(option);
    // yargs also populates a camelCase key for each kebab-case option
    target.add(kebabToCamelCase(option));
  }
};

const kebabToCamelCase = (value: string): string =>
  value.replace(/-([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
