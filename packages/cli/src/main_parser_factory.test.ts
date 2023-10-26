import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import {
  TestCommandError,
  TestCommandRunner,
} from './test-utils/command_runner.js';
import { createMainParser } from './main_parser_factory.js';
import path from 'node:path';
import { EOL } from 'node:os';

void describe('main parser', { concurrency: false }, () => {
  let configDir: string;

  before(async () => {
    configDir = await fs.mkdtemp('amplify_cmd_test');
    const configFilePath = path.join(process.cwd(), configDir, 'config');
    await fs.writeFile(configFilePath, `[profile foo]${EOL}x=y`);

    const credFilePath = path.join(process.cwd(), configDir, 'credentials');
    await fs.writeFile(credFilePath, `[profile bar]${EOL}a=b`);

    process.env.AWS_CONFIG_FILE = configFilePath;
    process.env.AWS_SHARED_CREDENTIALS_FILE = credFilePath;
  });

  after(async () => {
    await fs.rm(configDir, { recursive: true, force: true });
    delete process.env.AWS_CONFIG_FILE;
    delete process.env.AWS_SHARED_CREDENTIALS_FILE;
  });

  const parser = createMainParser();
  const commandRunner = new TestCommandRunner(parser);

  void it('includes generate command in help output', async () => {
    const output = await commandRunner.runCommand('--help');
    assert.match(output, /Commands:/);
    assert.match(output, /generate {2}Generates post deployment artifacts/);
  });

  void it('fails if command is not provided', async () => {
    await assert.rejects(
      () => commandRunner.runCommand(''),
      (err: TestCommandError) => {
        assert.equal(err.error.name, 'YError');
        assert.match(err.error.message, /Not enough non-option arguments:/);
        assert.match(err.output, /Commands:/);
        assert.match(err.output, /Not enough non-option arguments:/);
        return true;
      }
    );
  });

  void it('throws if the aws config file is absent', async () => {
    const curConfigFile = process.env.AWS_CONFIG_FILE;
    process.env.AWS_CONFIG_FILE = '/some/invalid/path';
    await assert.rejects(() => commandRunner.runCommand('--help'));
    process.env.AWS_CONFIG_FILE = curConfigFile;
  });

  void it('throws if the aws credential file is absent', async () => {
    const curCredFile = process.env.AWS_SHARED_CREDENTIALS_FILE;
    process.env.AWS_SHARED_CREDENTIALS_FILE = '/some/invalid/path';
    await assert.rejects(() => commandRunner.runCommand('--help'));
    process.env.AWS_SHARED_CREDENTIALS_FILE = curCredFile;
  });
});
