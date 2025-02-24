import { BackendDeployer } from '@aws-amplify/backend-deployer';
import { format, printer } from '@aws-amplify/cli-core';
import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import { CheckCommand } from './check_command.js';

void describe('check command', () => {
  const deployMock = mock.fn<typeof backendDeployerMock.deploy>();
  const backendDeployerMock = {
    deploy: deployMock,
  } as unknown as BackendDeployer;

  const printerMock = {
    print: mock.fn(),
    indicateProgress: mock.fn(
      async (message: string, action: () => Promise<void>) => {
        await action();
      }
    ),
  };

  mock.method(printer, 'print', printerMock.print);
  mock.method(printer, 'indicateProgress', printerMock.indicateProgress);

  beforeEach(() => {
    deployMock.mock.resetCalls();
    printerMock.print.mock.resetCalls();
    printerMock.indicateProgress.mock.resetCalls();
  });

  void it('runs type checking and CDK synthesis without deployment', async () => {
    const command = new CheckCommand(backendDeployerMock);
    const synthesisTime = 1.23;

    deployMock.mock.mockImplementation(async () => ({
      deploymentTimes: {
        synthesisTime,
      },
    }));

    await command.handler();

    // Verify deploy was called with correct arguments
    assert.strictEqual(deployMock.mock.callCount(), 1);
    assert.deepStrictEqual(deployMock.mock.calls[0].arguments[0], {
      namespace: 'sandbox',
      name: 'dev',
      type: 'sandbox',
    });
    assert.deepStrictEqual(deployMock.mock.calls[0].arguments[1], {
      validateAppSources: true,
      dryRun: true,
    });

    // Verify progress indicator was shown
    assert.strictEqual(printerMock.indicateProgress.mock.callCount(), 1);
    assert.strictEqual(
      printerMock.indicateProgress.mock.calls[0].arguments[0],
      'Running type checks and CDK synthesis...'
    );

    // Verify success message was printed
    assert.strictEqual(printerMock.print.mock.callCount(), 1);
    assert.strictEqual(
      printerMock.print.mock.calls[0].arguments[0],
      format.success(
        `✔ Type checking and CDK synthesis completed successfully ` +
          format.highlight(`(${synthesisTime}s)`)
      )
    );
  });
});
