import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import fsp from 'fs/promises';
import {
  TestCommandError,
  TestCommandRunner,
} from './test-utils/command_runner.js';
import { createMainParser } from './main_parser_factory.js';
import { NoticesRenderer } from './notices/notices_renderer.js';
import { fileURLToPath } from 'node:url';
import { TelemetryDataEmitter } from '@aws-amplify/platform-core';

void describe('main parser', { concurrency: false }, async () => {
  const packageJson = JSON.parse(
    await fsp.readFile(
      fileURLToPath(new URL('../package.json', import.meta.url)),
      'utf-8',
    ),
  );
  const version = packageJson.version;
  const tryFindAndPrintApplicableNoticesMock = mock.fn();
  const noticesRenderer = {
    tryFindAndPrintApplicableNotices: tryFindAndPrintApplicableNoticesMock,
  } as unknown as NoticesRenderer;

  // Telemetry data emitter mocks
  const emitTelemetrySuccessMock = mock.fn();
  const emitTelemetryFailureMock = mock.fn();
  const telemetryDataEmitterMock = {
    emitSuccess: emitTelemetrySuccessMock,
    emitFailure: emitTelemetryFailureMock,
  } as unknown as TelemetryDataEmitter;

  const parser = createMainParser(
    version,
    noticesRenderer,
    telemetryDataEmitterMock,
  );
  const commandRunner = new TestCommandRunner(parser);

  void it('includes generate command in help output', async () => {
    const output = await commandRunner.runCommand('--help');
    assert.match(output, /Commands:/);
    assert.match(output, /generate\s+Generates post deployment artifacts/);
  });

  void it('includes generate command in shorthand help output', async () => {
    const output = await commandRunner.runCommand('-h');
    assert.match(output, /Commands:/);
    assert.match(output, /generate\s+Generates post deployment artifacts/);
  });

  void it('shows version for long version option', async () => {
    const output = await commandRunner.runCommand('--version');
    assert.equal(output, `${version}\n`);
  });

  void it('shows version for shorthand version option', async () => {
    const output = await commandRunner.runCommand('-v');
    assert.equal(output, `${version}\n`);
  });

  void it('prints help if command is not provided', async () => {
    await assert.rejects(
      () => commandRunner.runCommand(''),
      (err) => {
        assert(err instanceof TestCommandError);
        assert.match(err.output, /Commands:/);
        assert.match(err.error.message, /Not enough non-option arguments:/);
        return true;
      },
    );
  });

  void it('errors and prints help if invalid option is given', async () => {
    await assert.rejects(
      () => commandRunner.runCommand('sandbox --non-existing-option 1'),
      (err) => {
        assert(err instanceof TestCommandError);
        assert.match(err.output, /Commands:/);
        assert.match(
          err.error.message,
          /Unknown arguments: non-existing-option/,
        );
        return true;
      },
    );
  });
});
