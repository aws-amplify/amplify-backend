import { /*beforeEach,*/ describe, it /*, mock*/ } from 'node:test';
//import { TestCommandRunner } from '../../../test-utils/command_runner.js';
//import { CommandMiddleware } from '../../../command_middleware.js';
//import { format, printer } from '@aws-amplify/cli-core';
//import { SandboxSingletonFactory } from '@aws-amplify/sandbox';

void describe('sandbox seed command', () => {
  /*let commandRunner: TestCommandRunner;
  let sandboxSeedMock = mock.fn();
  
  const commandMiddleware = new CommandMiddleware(printer);

  beforeEach(async () => {
    const sandboxFactory = new SandboxSingletonFactory(() => Promise.resolve({namespace: 'testSandboxId', name: 'testSandboxName',
      type: 'sandbox'}), printer, format);
    const sandbox = sandboxFactory.getInstance();
  });
  */
  void it('throws error if seed script is not found', async () => {});

  void it('runs seed if seed file is found', async () => {});
});
