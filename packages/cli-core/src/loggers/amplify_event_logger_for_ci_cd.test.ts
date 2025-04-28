/* eslint-disable spellcheck/spell-checker */
import { beforeEach, describe, it, mock } from 'node:test';
import { AmplifyIOEventsBridgeSingletonFactory } from './amplify_io_events_bridge_singleton_factory.js';
import { data as updateAmplifyOutputsCdkEvents } from './test-assets/update_amplify_outputs_structured_cdk_events.js';
import { data as noOpCdkEvents } from './test-assets/noop_cdk_events.js';
import { data as newAmplifyAppCdkEvents } from './test-assets/new_deployment_structured_cdk_events.js';
import { data as addFunctionStorageCdkEvents } from './test-assets/add_function_storage_cdk_events.js';
import { data as deleteFunctionStorageCdkEvents } from './test-assets/delete_function_storage_cdk_events.js';
import { data as destroyAppCdkEvents } from './test-assets/destroy_cdk_structured_events.js';
import { data as failedCfnDeploymentCdkEvents } from './test-assets/failed_auth_structured_cdk_events.js';

import { AmplifyIoHostEventMessage } from '@aws-amplify/plugin-types';
import { ConsolePrinter } from '../printer/console_printer.js';
import assert from 'node:assert';
import { format } from '../format/format.js';
import { LogLevel } from '../printer/printer.js';

void describe('amplify ci/cd event logging', () => {
  const printer = new ConsolePrinter(
    LogLevel.INFO,
    process.stdout,
    process.stderr,
    100,
    false,
  );
  const printerLogMock = mock.method(printer, 'log', () => {});
  const printerStartSpinnerMock = mock.method(printer, 'startSpinner');
  const printerUpdateSpinnerMock = mock.method(printer, 'updateSpinner');
  const printerStopSpinnerMock = mock.method(printer, 'stopSpinner');
  const printerPrintsMock = mock.method(printer, 'print');

  const classUnderTest = new AmplifyIOEventsBridgeSingletonFactory(
    printer,
  ).getInstance();

  beforeEach(() => {
    printerLogMock.mock.resetCalls();
    printerStartSpinnerMock.mock.resetCalls();
    printerUpdateSpinnerMock.mock.resetCalls();
    printerStopSpinnerMock.mock.resetCalls();
    printerPrintsMock.mock.resetCalls();
  });

  void it('generates correct events when customer updated amplify outputs and nothing else', async () => {
    for (const event of updateAmplifyOutputsCdkEvents) {
      await classUnderTest.notify(
        event as unknown as AmplifyIoHostEventMessage<unknown>,
      );
    }

    // Typical success messages printed. startSpinner uses printer.log() for non tty
    assert.deepStrictEqual(printerLogMock.mock.callCount(), 8);
    assert.deepStrictEqual(
      printerLogMock.mock.calls.map((call) => call.arguments[0]),
      [
        'Synthesizing backend...',
        format.success('✔') + ' Backend synthesized in 1.55 seconds',
        'Running type checks...',
        format.success('✔') + ' Type checks completed in 4.9 seconds',
        'Building and publishing assets...',
        format.success('✔') + ' Built and published assets',
        format.success('✔') + ' Deployment completed in 55.447 seconds',
        'AppSync API endpoint = ' +
          format.link(
            'https://ystl6ikbafavph56jdnbbbklmu.appsync-api.us-west-2.amazonaws.com/graphql',
          ),
      ],
    );

    // Spinners
    assert.deepStrictEqual(printerStartSpinnerMock.mock.callCount(), 3);
    assert.deepStrictEqual(
      printerStartSpinnerMock.mock.calls.map((call) => call.arguments[0]),
      [
        'Synthesizing backend...',
        'Running type checks...',
        'Building and publishing assets...',
      ],
    );
    assert.deepStrictEqual(printerStopSpinnerMock.mock.callCount(), 3);

    // CFN updates coming straight formatted from CDK as-is
    assert.deepStrictEqual(printerPrintsMock.mock.callCount(), 27);

    // We assert 1 print call for validating formatting
    assert.deepStrictEqual(
      printerPrintsMock.mock.calls[0].arguments[0],
      'amplify-sampleprojectapp-user-sandbox-0e1752a889 | 0/5 | 11:26:02 PM | UPDATE_IN_PROGRESS | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0e1752a889 User Initiated',
    );
  });

  void it('generates correct events when no change in the app is detected', async () => {
    for (const event of noOpCdkEvents) {
      await classUnderTest.notify(
        event as unknown as AmplifyIoHostEventMessage<unknown>,
      );
    }

    // Typical success messages printed
    assert.deepStrictEqual(printerLogMock.mock.callCount(), 8);
    assert.deepStrictEqual(
      printerLogMock.mock.calls.map((call) => call.arguments[0]),
      [
        'Synthesizing backend...',
        format.success('✔') + ' Backend synthesized in 1.9 seconds',
        'Running type checks...',
        format.success('✔') + ' Type checks completed in 4.79 seconds',
        'Building and publishing assets...',
        format.success('✔') + ' Built and published assets',
        format.success('✔') + ' Deployment completed in 14.053 seconds',
        'AppSync API endpoint = ' +
          format.link(
            'https://32p5frr6ejcm7ddxhrrxherspm.appsync-api.us-west-2.amazonaws.com/graphql',
          ),
      ],
    );

    // CFN progress events (No CFN deployment for this case)
    assert.deepStrictEqual(printerPrintsMock.mock.callCount(), 0);

    // Spinners
    assert.deepStrictEqual(printerStartSpinnerMock.mock.callCount(), 3);
    assert.deepStrictEqual(
      printerStartSpinnerMock.mock.calls.map((call) => call.arguments[0]),
      [
        'Synthesizing backend...',
        'Running type checks...',
        'Building and publishing assets...',
      ],
    );
    assert.deepStrictEqual(printerStopSpinnerMock.mock.callCount(), 3);
  });

  void it('generates correct events for a new fully loaded app with auth, storage, function, data and custom stack', async () => {
    for (const event of newAmplifyAppCdkEvents) {
      await classUnderTest.notify(
        event as unknown as AmplifyIoHostEventMessage<unknown>,
      );
    }

    // Typical success messages printed
    assert.deepStrictEqual(printerLogMock.mock.callCount(), 8);
    assert.deepStrictEqual(
      printerLogMock.mock.calls.map((call) => call.arguments[0]),
      [
        'Synthesizing backend...',
        format.success('✔') + ' Backend synthesized in 1.91 seconds',
        'Running type checks...',
        format.success('✔') + ' Type checks completed in 4.81 seconds',
        'Building and publishing assets...',
        format.success('✔') + ' Built and published assets',
        format.success('✔') + ' Deployment completed in 236.434 seconds',
        'AppSync API endpoint = ' +
          format.link(
            'https://ystl6ikbafavph56jdnbbbklmu.appsync-api.us-west-2.amazonaws.com/graphql',
          ),
      ],
    );

    // Spinners
    assert.deepStrictEqual(printerStartSpinnerMock.mock.callCount(), 3);
    assert.deepStrictEqual(
      printerStartSpinnerMock.mock.calls.map((call) => call.arguments[0]),
      [
        'Synthesizing backend...',
        'Running type checks...',
        'Building and publishing assets...',
      ],
    );
    assert.deepStrictEqual(printerStopSpinnerMock.mock.callCount(), 3);

    // CFN updates coming straight formatted from CDK as-is
    assert.deepStrictEqual(printerPrintsMock.mock.callCount(), 495);

    // We assert 1 print call for validating formatting
    assert.deepStrictEqual(
      printerPrintsMock.mock.calls[0].arguments[0],
      'amplify-sampleprojectapp-user-sandbox-0e1752a889 | 0/7 | 11:09:36 PM | REVIEW_IN_PROGRESS | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0e1752a889 User Initiated',
    );
  });

  void it('generates correct events when storage and function are added to existing stack', async () => {
    for (const event of addFunctionStorageCdkEvents) {
      await classUnderTest.notify(
        event as unknown as AmplifyIoHostEventMessage<unknown>,
      );
    }

    // Typical success messages printed
    assert.deepStrictEqual(printerLogMock.mock.callCount(), 8);
    assert.deepStrictEqual(
      printerLogMock.mock.calls.map((call) => call.arguments[0]),
      [
        'Synthesizing backend...',
        format.success('✔') + ' Backend synthesized in 1.94 seconds',
        'Running type checks...',
        format.success('✔') + ' Type checks completed in 4.84 seconds',
        'Building and publishing assets...',
        format.success('✔') + ' Built and published assets',
        format.success('✔') + ' Deployment completed in 151.384 seconds',
        'AppSync API endpoint = ' +
          format.link(
            'https://ystl6ikbafavph56jdnbbbklmu.appsync-api.us-west-2.amazonaws.com/graphql',
          ),
      ],
    );

    // Spinners
    assert.deepStrictEqual(printerStartSpinnerMock.mock.callCount(), 3);
    assert.deepStrictEqual(
      printerStartSpinnerMock.mock.calls.map((call) => call.arguments[0]),
      [
        'Synthesizing backend...',
        'Running type checks...',
        'Building and publishing assets...',
      ],
    );
    assert.deepStrictEqual(printerStopSpinnerMock.mock.callCount(), 3);

    // CFN updates coming straight formatted from CDK as-is
    assert.deepStrictEqual(printerPrintsMock.mock.callCount(), 86);

    // We assert 1 print call for validating formatting
    assert.deepStrictEqual(
      printerPrintsMock.mock.calls[0].arguments[0],
      'amplify-sampleprojectapp-user-sandbox-0e1752a889 | 0/7 | 12:01:02 PM | UPDATE_IN_PROGRESS | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0e1752a889 User Initiated',
    );
  });

  void it('generates correct events when storage and function are deleted from existing stack', async () => {
    for (const event of deleteFunctionStorageCdkEvents) {
      await classUnderTest.notify(
        event as unknown as AmplifyIoHostEventMessage<unknown>,
      );
    }

    // Typical success messages printed
    assert.deepStrictEqual(printerLogMock.mock.callCount(), 8);
    assert.deepStrictEqual(
      printerLogMock.mock.calls.map((call) => call.arguments[0]),
      [
        'Synthesizing backend...',
        format.success('✔') + ' Backend synthesized in 1.91 seconds',
        'Running type checks...',
        format.success('✔') + ' Type checks completed in 4.81 seconds',
        'Building and publishing assets...',
        format.success('✔') + ' Built and published assets',
        format.success('✔') + ' Deployment completed in 87.347 seconds',
        'AppSync API endpoint = ' +
          format.link(
            'https://ystl6ikbafavph56jdnbbbklmu.appsync-api.us-west-2.amazonaws.com/graphql',
          ),
      ],
    );

    // Spinners
    assert.deepStrictEqual(printerStartSpinnerMock.mock.callCount(), 3);
    assert.deepStrictEqual(
      printerStartSpinnerMock.mock.calls.map((call) => call.arguments[0]),
      [
        'Synthesizing backend...',
        'Running type checks...',
        'Building and publishing assets...',
      ],
    );
    assert.deepStrictEqual(printerStopSpinnerMock.mock.callCount(), 3);

    // CFN updates coming straight formatted from CDK as-is
    assert.deepStrictEqual(printerPrintsMock.mock.callCount(), 69);

    // We assert 1 print call for validating formatting
    assert.deepStrictEqual(
      printerPrintsMock.mock.calls[0].arguments[0],
      'amplify-sampleprojectapp-user-sandbox-0e1752a889 | 0/7 | 11:20:31 PM | UPDATE_IN_PROGRESS | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0e1752a889 User Initiated',
    );
  });

  void it('generates correct events when fully loaded app is deleted', async () => {
    for (const event of destroyAppCdkEvents) {
      await classUnderTest.notify(
        event as unknown as AmplifyIoHostEventMessage<unknown>,
      );
    }

    // Backend synthesized or TS checks are not run on destroy
    assert.deepStrictEqual(printerLogMock.mock.callCount(), 0);

    // No Spinners
    assert.deepStrictEqual(printerStartSpinnerMock.mock.callCount(), 0);
    assert.deepStrictEqual(printerStopSpinnerMock.mock.callCount(), 0);

    // CFN updates coming straight formatted from CDK as-is
    assert.deepStrictEqual(printerPrintsMock.mock.callCount(), 340);

    // We assert 1 print call for validating formatting
    assert.deepStrictEqual(
      printerPrintsMock.mock.calls[0].arguments[0],
      'amplify-sampleprojectapp-user-sandbox-0e1752a889 |   0 | 11:05:29 PM | DELETE_IN_PROGRESS | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0e1752a889 User Initiated',
    );
  });

  void it('generates correct events when cfn deployment has failed', async () => {
    for (const event of failedCfnDeploymentCdkEvents) {
      await classUnderTest.notify(
        event as unknown as AmplifyIoHostEventMessage<unknown>,
      );
    }

    // Typical success messages printed
    assert.deepStrictEqual(printerLogMock.mock.callCount(), 6);
    assert.deepStrictEqual(
      printerLogMock.mock.calls.map((call) => call.arguments[0]),
      [
        'Synthesizing backend...',
        format.success('✔') + ' Backend synthesized in 1.5 seconds',
        'Running type checks...',
        format.success('✔') + ' Type checks completed in 5.04 seconds',
        'Building and publishing assets...',
        format.success('✔') + ' Built and published assets',
      ],
    );

    // Spinners
    assert.deepStrictEqual(printerStartSpinnerMock.mock.callCount(), 3);
    assert.deepStrictEqual(
      printerStartSpinnerMock.mock.calls.map((call) => call.arguments[0]),
      [
        'Synthesizing backend...',
        'Running type checks...',
        'Building and publishing assets...',
      ],
    );
    assert.deepStrictEqual(printerStopSpinnerMock.mock.callCount(), 3);

    // CFN updates coming straight formatted from CDK as-is
    assert.deepStrictEqual(printerPrintsMock.mock.callCount(), 22);

    // We assert 1 print call for validating formatting
    assert.deepStrictEqual(
      printerPrintsMock.mock.calls[0].arguments[0],
      'amplify-sampleprojectapp-user-sandbox-0e1752a889 | 0/5 | 11:31:09 PM | UPDATE_IN_PROGRESS | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0e1752a889 User Initiated',
    );
  });
});
