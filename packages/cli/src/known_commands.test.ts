import { describe, it } from 'node:test';
import assert from 'node:assert';
import yargs, { Argv, Options } from 'yargs';
import {
  KnownCommand,
  knownCommands,
  resolveKnownCommand,
  unknownArgumentPlaceholder,
} from './known_commands.js';
import { createMainParser } from './main_parser_factory.js';
import { NoticesRenderer } from './notices/notices_renderer.js';

const canary = 'AMPX_TEST_CANARY_VALUE';
const unknown = '<unknown>';

void describe('resolveKnownCommand', () => {
  void it('uses a fixed placeholder', () => {
    assert.strictEqual(unknownArgumentPlaceholder, unknown);
  });

  void it('returns path for known commands', () => {
    assert.deepStrictEqual(
      resolveKnownCommand(['sandbox', 'secret', 'set']).path,
      ['sandbox', 'secret', 'set'],
    );
    assert.deepStrictEqual(resolveKnownCommand(['generate', 'outputs']).path, [
      'generate',
      'outputs',
    ]);
    assert.deepStrictEqual(resolveKnownCommand(['pipeline-deploy']).path, [
      'pipeline-deploy',
    ]);
  });

  void it('records undeclared positional arguments as placeholder', () => {
    assert.deepStrictEqual(
      resolveKnownCommand(['sandbox', 'secret', 'set', canary]).path,
      ['sandbox', 'secret', 'set', unknown],
    );
    assert.deepStrictEqual(resolveKnownCommand(['sandbox', canary]).path, [
      'sandbox',
      unknown,
    ]);
  });

  void it('records unknown command as placeholder', () => {
    assert.deepStrictEqual(resolveKnownCommand([canary]).path, [unknown]);
    assert.deepStrictEqual(resolveKnownCommand([]).path, []);
  });

  void it('records every argument after the first unknown argument as placeholder', () => {
    assert.deepStrictEqual(resolveKnownCommand([canary, 'sandbox']).path, [
      unknown,
      unknown,
    ]);
    assert.deepStrictEqual(
      resolveKnownCommand(['sandbox', canary, 'seed', 'generate-policy']).path,
      ['sandbox', unknown, unknown, unknown],
    );
  });

  void it('placeholder does not depend on the unrecognized argument', () => {
    const expected = ['sandbox', unknown];
    for (const arg of ['a', canary, canary.repeat(10), '', ' ', '<unknown>']) {
      assert.deepStrictEqual(
        resolveKnownCommand(['sandbox', arg]).path,
        expected,
      );
    }
  });

  void it('only matches subcommands of the previously matched command', () => {
    assert.deepStrictEqual(resolveKnownCommand(['set']).path, [unknown]);
    assert.deepStrictEqual(resolveKnownCommand(['sandbox', 'set']).path, [
      'sandbox',
      unknown,
    ]);
    assert.deepStrictEqual(
      resolveKnownCommand(['sandbox', 'delete', 'seed']).path,
      ['sandbox', 'delete', unknown],
    );
  });

  void it('does not match object prototype property names', () => {
    for (const name of [
      'constructor',
      '__proto__',
      'toString',
      'hasOwnProperty',
    ]) {
      assert.deepStrictEqual(resolveKnownCommand([name]).path, [unknown]);
      assert.deepStrictEqual(resolveKnownCommand(['sandbox', name]).path, [
        'sandbox',
        unknown,
      ]);
    }
  });

  void it('converts non-string arguments to strings', () => {
    assert.deepStrictEqual(resolveKnownCommand([123]).path, [unknown]);
  });

  void it('returns option names declared by root and matched commands', () => {
    const { declaredOptions } = resolveKnownCommand([
      'sandbox',
      'delete',
      canary,
    ]);
    for (const option of [
      'debug',
      'help',
      'version',
      'dir-to-watch',
      'dirToWatch',
      'yes',
      'y',
    ]) {
      assert.ok(declaredOptions.has(option), option);
    }
    assert.ok(!declaredOptions.has('app-id'));
    assert.ok(!declaredOptions.has(canary));
  });
});

/**
 * Minimal view of yargs internals used to enumerate registered commands and options.
 * If yargs changes these internals, update this test accordingly.
 */
type YargsCommandHandler = {
  original: string;
  builder?: ((yargs: Argv) => Argv | void) | Record<string, Options>;
};
type YargsWithInternals = Argv & {
  getOptions: () => {
    key: Record<string, unknown>;
    alias: Record<string, string[]>;
  };
  getInternalMethods: () => {
    getCommandInstance: () => {
      getCommandHandlers: () => Record<string, YargsCommandHandler>;
    };
  };
};

// Options that every yargs instance has. For the CLI these are declared once by the root parser.
const yargsDefaultOptions = ['help', 'version'];

const describeRegisteredCommands = (
  parser: Argv,
  isRoot: boolean,
  commandString = '',
): KnownCommand => {
  const internals = parser as YargsWithInternals;
  const { key, alias } = internals.getOptions();
  const optionNames = new Set<string>([
    ...Object.keys(key),
    ...Object.keys(alias),
    ...Object.values(alias).flat(),
  ]);
  if (!isRoot) {
    yargsDefaultOptions.forEach((option) => optionNames.delete(option));
  }
  // positional arguments declared in the command string, e.g. 'set <key> [value]'
  for (const match of commandString.matchAll(/[<[]([^>\]]+)[>\]]/g)) {
    match[1]
      .replace(/\.\./g, '')
      .split('|')
      .forEach((name) => optionNames.add(name));
  }

  const subCommands: Record<string, KnownCommand> = {};
  const handlers = internals
    .getInternalMethods()
    .getCommandInstance()
    .getCommandHandlers();
  for (const [name, handler] of Object.entries(handlers)) {
    let childParser: Argv = yargs();
    if (typeof handler.builder === 'function') {
      childParser = handler.builder(childParser) ?? childParser;
    } else if (handler.builder) {
      childParser = childParser.options(handler.builder);
    }
    subCommands[name] = describeRegisteredCommands(
      childParser,
      false,
      handler.original,
    );
  }

  return { options: [...optionNames], subCommands };
};

type NormalizedCommand = {
  options: string[];
  subCommands: Record<string, NormalizedCommand>;
};

const normalize = (command: KnownCommand): NormalizedCommand => ({
  options: [...new Set(command.options ?? [])].sort(),
  subCommands: Object.fromEntries(
    Object.keys(command.subCommands ?? {})
      .sort()
      .map((name) => [name, normalize(command.subCommands![name])]),
  ),
});

void describe('knownCommands', () => {
  void it('matches commands and options registered in main parser', () => {
    const noticesRenderer = {
      tryFindAndPrintApplicableNotices: () => Promise.resolve(),
    } as unknown as NoticesRenderer;
    const parser = createMainParser('0.0.0', noticesRenderer);

    assert.deepStrictEqual(
      normalize(knownCommands),
      normalize(describeRegisteredCommands(parser, true)),
      'knownCommands in known_commands.ts must match the commands and options registered in main_parser_factory.ts',
    );
  });
});
