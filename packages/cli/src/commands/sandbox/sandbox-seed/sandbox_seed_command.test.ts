import { afterEach, beforeEach, describe, it /*, mock*/ } from 'node:test';
import fs from 'fs/promises';
//import { format, printer } from '@aws-amplify/cli-core';
import * as path from 'path';
//import { TestCommandRunner } from '../../../test-utils/command_runner.js';
//import { CommandMiddleware } from '../../../command_middleware.js';
//import { SandboxSingletonFactory } from '@aws-amplify/sandbox';
//import yargs, { CommandModule } from 'yargs';
//import { SandboxSeedCommand } from './sandbox_seed_command.js';
//import { SandboxBackendIdResolver } from '../sandbox_id_resolver.js';

//const seedFileContents = "console.log('seed has been run :D');";
//const testBackendId = 'testBackendId';
//const testSandboxName = 'testSandboxName';

void describe('sandbox seed command', () => {
  //let sandboxSeedMock = mock.fn();
  //I have no idea what I am doing...
  /*const sandboxIdResolver: SandboxBackendIdResolver = {
      resolve: (identifier?: string) =>
        Promise.resolve({
          namespace: testBackendId,
          name: identifier || testSandboxName,
          type: 'sandbox',
        }),
    } as SandboxBackendIdResolver;*/

  //const sandboxSeedCmd = new SandboxSeedCommand();
  /*const parser = yargs().command(
    sandboxSeedCmd as CommandModule
  );*/
  //const commandRunner = new TestCommandRunner(parser);

  let testDir: string;
  let amplifyDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp('testDir');
    amplifyDir = path.join(process.cwd(), testDir, 'amplify');

    //sandboxSeedMock.mock.resetCalls();
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    if (process.env.AMPLIFY_SANDBOX_IDENTIFIER) {
      delete process.env.AMPLIFY_SANDBOX_IDENTIFIER;
    }
  });

  void it('throws error if seed script is not found', async () => {
    //how to mock seed command
  });

  void it('runs seed if seed file is found', async () => {
    path.join(process.cwd(), amplifyDir, 'seed', 'seed.ts');
  });
});
