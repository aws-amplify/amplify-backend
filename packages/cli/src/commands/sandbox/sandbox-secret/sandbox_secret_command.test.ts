import { describe, it } from 'node:test';
import yargs, { CommandModule } from 'yargs';
import { TestCommandRunner } from '../../../test-utils/command_runner.js';
import assert from 'node:assert';
import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';
import { getSecretClient } from '@aws-amplify/backend-secret';
import { SandboxSecretCommand } from './sandbox_secret_command.js';
import { SandboxSecretGetCommand } from './sandbox_secret_get_command.js';

const testBackendId = 'testBackendId';

void describe('sandbox secret command', () => {
  const secretClient = getSecretClient();
  const sandboxIdResolver = new SandboxBackendIdResolver({
    resolve: () => Promise.resolve(testBackendId),
  });

  // Creates only a 'get' subcommand.
  const sandboxSecretCmd = new SandboxSecretCommand([
    new SandboxSecretGetCommand(
      sandboxIdResolver,
      secretClient
    ) as unknown as CommandModule,
  ]);

  const parser = yargs().command(sandboxSecretCmd);
  const commandRunner = new TestCommandRunner(parser);

  void it('show --help', async () => {
    const output = await commandRunner.runCommand('secret --help');
    assert.match(output, /Manage sandbox secret/);
    ['secret get'].forEach((cmd) => assert.match(output, new RegExp(cmd)));
    ['secret set', 'secret list', 'secret remove'].forEach((cmd) =>
      assert.doesNotMatch(output, new RegExp(cmd))
    );
  });

  void it('throws error if no verb subcommand', async () => {
    const output = await commandRunner.runCommand('secret');
    assert.match(output, /Not enough non-option arguments/);
  });
});
