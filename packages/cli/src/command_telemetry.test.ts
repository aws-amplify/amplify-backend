import { after, before, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { PassThrough } from 'node:stream';
import { ReadStream } from 'node:tty';
import yargs, { Argv, CommandModule } from 'yargs';
import { Span } from '@opentelemetry/api';
import {
  AmplifyError,
  TelemetryPayload,
  UsageDataEmitter,
  setSpanAttributes,
  telemetryPayloadSchema,
  translateErrorToTelemetryErrorDetails,
} from '@aws-amplify/platform-core';
import { DeepPartial } from '@aws-amplify/plugin-types';
import { printer } from '@aws-amplify/cli-core';
import { SecretClient } from '@aws-amplify/backend-secret';
import { createMainParser } from './main_parser_factory.js';
import { NoticesRenderer } from './notices/notices_renderer.js';
import { extractCommandInfo } from './extract_command_info.js';
import { extractSubCommands } from './extract_sub_commands.js';
import { generateCommandFailureHandler } from './error_handler.js';
import { SandboxSecretSetCommand } from './commands/sandbox/sandbox-secret/sandbox_secret_set_command.js';
import { SandboxBackendIdResolver } from './commands/sandbox/sandbox_id_resolver.js';

const canary = 'AMPX_TEST_CANARY_VALUE';
const unknown = '<unknown>';

const assertNoCanary = (serialized: string) => {
  assert.ok(!serialized.includes(canary), serialized);
  // yargs also reports camelCase variants of unknown option names, e.g. xAMPXTESTCANARYVALUE
  const normalized = serialized.toLowerCase().replaceAll(/[^a-z0-9]/g, '');
  assert.ok(
    !normalized.includes(canary.toLowerCase().replaceAll('_', '')),
    serialized,
  );
};

/**
 * Thrown by a global middleware registered on the test parser.
 * Global middleware registered before parsing runs ahead of command middleware and handlers,
 * so commands are never executed by these tests.
 */
class CommandExecutionStoppedError extends Error {}

const noticesRenderer = {
  tryFindAndPrintApplicableNotices: () => Promise.resolve(),
} as unknown as NoticesRenderer;

const parseWithoutRunningCommand = async (args: string[]) => {
  const parser = createMainParser('0.0.0', noticesRenderer)
    .locale('en')
    .exitProcess(false)
    .middleware(() => {
      throw new CommandExecutionStoppedError();
    });
  let error: Error | undefined;
  try {
    await parser.parseAsync(args);
  } catch (e) {
    error = e as Error;
  }
  assert.ok(error, 'Expected parsing to stop before running the command');
  return { parser, error };
};

/**
 * Produces the error raised by input validation of the `set` subcommand.
 * Uses the subcommand on its own so that no other middleware is involved.
 */
const getSetCommandValidationError = async (args: string[]) => {
  const readStream = new PassThrough();
  readStream.end();
  const sandboxSecretSetCommand = new SandboxSecretSetCommand(
    {
      resolve: () => Promise.reject(new Error('Not expected in this test')),
    } as unknown as SandboxBackendIdResolver,
    {
      setSecret: () => Promise.reject(new Error('Not expected in this test')),
    } as unknown as SecretClient,
    readStream as unknown as ReadStream,
  );
  const parser = yargs()
    .command(sandboxSecretSetCommand as unknown as CommandModule)
    .exitProcess(false)
    .fail(false);
  try {
    await parser.parseAsync(args);
  } catch (e) {
    return e as Error;
  }
  assert.fail('Expected input validation error');
};

// Mirrors how the telemetry exporter turns span attributes into a payload.
const unflattenSpanAttributes = (attributes: Record<string, unknown>) => {
  const result: Record<string, unknown> = {};
  for (const [flatKey, value] of Object.entries(attributes)) {
    const keys = flatKey.split('.');
    let current = result;
    for (const key of keys.slice(0, -1)) {
      current[key] ??= {};
      current = current[key] as Record<string, unknown>;
    }
    current[keys[keys.length - 1]] = value;
  }
  return result;
};

/**
 * Builds the OTel telemetry payload the same way ampx.ts and the telemetry exporter do,
 * and the usage data dimensions passed by the command failure handler.
 */
const collectTelemetry = async (parser: Argv, error: Error) => {
  const data: DeepPartial<TelemetryPayload> = {
    event: {
      state: 'FAILED',
      command: extractCommandInfo(parser) ?? { path: [], parameters: [] },
    },
    latency: { total: 10, init: 1 },
    error: translateErrorToTelemetryErrorDetails(error),
  };
  const spanAttributes: Record<string, unknown> = {};
  const span = {
    setAttribute: (key: string, value: unknown) => {
      spanAttributes[key] = value;
    },
  } as unknown as Span;
  setSpanAttributes(span, data);

  const telemetryPayload = telemetryPayloadSchema.parse({
    identifiers: {
      payloadVersion: '1.0.0',
      sessionUuid: 'testSessionUuid',
      eventId: 'testEventId',
      timestamp: 'testTimestamp',
      localProjectId: 'testLocalProjectId',
    },
    environment: {
      os: { platform: 'testPlatform', release: 'testRelease' },
      shell: 'testShell',
      npmUserAgent: 'testNpmUserAgent',
      ci: false,
      memory: { total: 1, free: 1 },
    },
    project: {},
    ...unflattenSpanAttributes(spanAttributes),
  });

  const emitFailure = mock.fn<UsageDataEmitter['emitFailure']>(() =>
    Promise.resolve(),
  );
  const usageDataEmitter: UsageDataEmitter = {
    emitSuccess: () => Promise.resolve(),
    emitFailure,
  };
  mock.method(parser, 'showHelp', () => parser);
  await generateCommandFailureHandler(parser, usageDataEmitter)(
    error.message,
    error,
  );
  assert.equal(emitFailure.mock.callCount(), 1);
  const [usageDataError, usageDataDimensions] =
    emitFailure.mock.calls[0].arguments;

  return {
    spanAttributes,
    telemetryPayload,
    usageDataError,
    usageDataDimensions,
  };
};

void describe('command telemetry', () => {
  before(() => {
    mock.method(printer, 'print', () => {});
    mock.method(printer, 'log', () => {});
  });

  after(() => {
    mock.restoreAll();
  });

  void describe('does not include free-form input', () => {
    const testCases: Array<{
      description: string;
      args: string[];
      getError?: () => Promise<Error>;
      expectedPath: string[];
      expectedParameters: string[];
    }> = [
      {
        description: 'undeclared positional argument after a command',
        args: ['sandbox', 'secret', 'set', 'NAME', canary],
        expectedPath: ['sandbox', 'secret', 'set', unknown],
        expectedParameters: ['secret-name', 'secretName'],
      },
      {
        description: 'NAME=VALUE positional argument',
        args: ['sandbox', 'secret', 'set', `NAME=${canary}`],
        getError: () => getSetCommandValidationError(['set', `NAME=${canary}`]),
        expectedPath: ['sandbox', 'secret', 'set'],
        expectedParameters: ['secret-name', 'secretName'],
      },
      {
        description: 'unknown option name',
        args: ['sandbox', `--${canary}`],
        expectedPath: ['sandbox'],
        expectedParameters: ['outputs-version', 'outputsVersion'],
      },
      {
        description: 'unknown kebab-case option name',
        args: ['sandbox', `--x-${canary}`, 'value'],
        expectedPath: ['sandbox'],
        expectedParameters: ['outputs-version', 'outputsVersion'],
      },
      {
        description: 'unknown command',
        args: [canary],
        expectedPath: [unknown],
        expectedParameters: [],
      },
      {
        description: 'unknown subcommand',
        args: ['sandbox', canary],
        expectedPath: ['sandbox', unknown],
        expectedParameters: ['outputs-version', 'outputsVersion'],
      },
      {
        description: 'multiple words after unknown subcommand',
        args: ['sandbox', canary, 'other', canary],
        expectedPath: ['sandbox', unknown, unknown, unknown],
        expectedParameters: ['outputs-version', 'outputsVersion'],
      },
      {
        description: 'undeclared positional argument after positional values',
        args: ['secret', 'set', 'KEY', 'VALUE', canary],
        expectedPath: ['secret', 'set', unknown],
        expectedParameters: ['key', 'value'],
      },
      {
        description: 'option value',
        args: ['sandbox', '--identifier', canary],
        expectedPath: ['sandbox'],
        expectedParameters: ['identifier', 'outputs-version', 'outputsVersion'],
      },
    ];

    for (const testCase of testCases) {
      void it(testCase.description, async () => {
        const { parser, error: parseError } = await parseWithoutRunningCommand(
          testCase.args,
        );
        const error = testCase.getError
          ? await testCase.getError()
          : parseError;

        // the input reaches the parser output or the error message
        assert.ok(
          JSON.stringify(parser.parsed && parser.parsed.argv).includes(
            canary,
          ) || error.message.includes(canary),
        );

        const {
          spanAttributes,
          telemetryPayload,
          usageDataError,
          usageDataDimensions,
        } = await collectTelemetry(parser, error);

        assertNoCanary(JSON.stringify(spanAttributes));
        assertNoCanary(JSON.stringify(telemetryPayload));
        assertNoCanary(JSON.stringify(usageDataDimensions));
        assert.deepStrictEqual(telemetryPayload.event.command, {
          path: testCase.expectedPath,
          parameters: testCase.expectedParameters,
        });
        assert.deepStrictEqual(usageDataDimensions, {
          command: testCase.expectedPath.join(' '),
        });
        // usage data serializes only the error name, which is a fixed string
        assert.ok(AmplifyError.isAmplifyError(usageDataError));
        assertNoCanary(usageDataError.name);
      });
    }
  });

  void describe('records known commands and declared options', () => {
    const testCases: Array<{
      args: string[];
      expectedPath: string[];
      expectedParameters: string[];
    }> = [
      {
        args: ['sandbox', 'secret', 'set', 'NAME'],
        expectedPath: ['sandbox', 'secret', 'set'],
        expectedParameters: ['secret-name', 'secretName'],
      },
      {
        args: ['generate', 'outputs', '--app-id', 'a', '--branch', 'b'],
        expectedPath: ['generate', 'outputs'],
        expectedParameters: [
          'app-id',
          'appId',
          'branch',
          'outputs-version',
          'outputsVersion',
        ],
      },
      {
        args: ['pipeline-deploy', '--app-id', 'a', '--branch', 'b'],
        expectedPath: ['pipeline-deploy'],
        expectedParameters: [
          'app-id',
          'appId',
          'branch',
          'outputs-version',
          'outputsVersion',
        ],
      },
      {
        args: ['sandbox', 'delete', '-y', '--debug'],
        expectedPath: ['sandbox', 'delete'],
        expectedParameters: ['debug', 'y', 'yes'],
      },
      {
        args: ['config', 'set', 'KEY', 'VALUE'],
        expectedPath: ['config', 'set'],
        expectedParameters: ['key', 'value'],
      },
    ];

    for (const testCase of testCases) {
      void it(testCase.args.join(' '), async () => {
        const { parser, error } = await parseWithoutRunningCommand(
          testCase.args,
        );
        assert.ok(error instanceof CommandExecutionStoppedError, error);
        assert.deepStrictEqual(extractCommandInfo(parser), {
          path: testCase.expectedPath,
          parameters: testCase.expectedParameters,
        });
        assert.strictEqual(
          extractSubCommands(parser),
          testCase.expectedPath.join(' '),
        );
      });
    }
  });
});
