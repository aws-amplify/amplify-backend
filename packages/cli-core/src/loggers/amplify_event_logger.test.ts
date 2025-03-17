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
import { LogLevel, Printer } from '../printer/printer.js';
import assert from 'node:assert';
import { format } from '../format/format.js';
import { EOL } from 'node:os';

void describe('amplify sandbox event logging', () => {
  const printer = new Printer(
    LogLevel.INFO,
    process.stdout,
    process.stderr,
    100,
    true,
  );
  const printerLogMock = mock.method(printer, 'log', () => {});
  const printerStartSpinnerMock = mock.method(printer, 'startSpinner');
  const printerUpdateSpinnerMock = mock.method(printer, 'updateSpinner');
  const printerStopSpinnerMock = mock.method(printer, 'stopSpinner');

  const classUnderTest = new AmplifyIOEventsBridgeSingletonFactory(
    printer,
  ).getInstance();

  beforeEach(() => {
    printerLogMock.mock.resetCalls();
    printerStartSpinnerMock.mock.resetCalls();
    printerUpdateSpinnerMock.mock.resetCalls();
    printerStopSpinnerMock.mock.resetCalls();
  });

  void it('generates correct events when customer updated amplify outputs and nothing else', async () => {
    for (const event of updateAmplifyOutputsCdkEvents) {
      await classUnderTest.notify(
        event as unknown as AmplifyIoHostEventMessage<unknown>,
      );
    }

    // Typical success messages printed
    assert.deepStrictEqual(printerLogMock.mock.callCount(), 5);
    assert.deepStrictEqual(
      printerLogMock.mock.calls.map((call) => call.arguments[0]),
      [
        format.success('✔') + ' Backend synthesized in 1.55 seconds',
        format.success('✔') + ' Type checks completed in 4.9 seconds',
        format.success('✔') + ' Built and published assets',
        format.success('✔') + ' Deployment completed in 55.447 seconds',
        'AppSync API endpoint = ' +
          format.link(
            'https://ystl6ikbafavph56jdnbbbklmu.appsync-api.us-west-2.amazonaws.com/graphql',
          ),
      ],
    );

    // CFN progress events
    assert.deepStrictEqual(printerUpdateSpinnerMock.mock.callCount(), 6);
    assert.deepStrictEqual(
      printerUpdateSpinnerMock.mock.calls.map(
        (call) => call.arguments[0]?.prefixText,
      ),
      [
        '',
        `${cll()}3:26:02 AM | ${format.color(
          'UPDATE_IN_PROGRESS  ',
          'Green',
        )} | CloudFormation:Stack      | ${format.color(
          format.bold('root stack'),
          'Green',
        )}${EOL}`,
        `${cll()}3:26:02 AM | ${format.color(
          'UPDATE_IN_PROGRESS  ',
          'Green',
        )} | CloudFormation:Stack      | ${format.color(
          format.bold('root stack'),
          'Green',
        )}${EOL}${cll()}3:26:07 AM | ${format.color(
          'UPDATE_IN_PROGRESS  ',
          'Green',
        )} | CloudFormation:Stack      | ${format.color(
          format.bold('∟ data stack'),
          'Green',
        )}${EOL}${cll()}3:26:06 AM | ${format.color(
          'UPDATE_IN_PROGRESS  ',
          'Green',
        )} | CloudFormation:Stack      | ${format.color(
          format.bold('data'),
          'Green',
        )}${EOL}`,
        `${cll()}3:26:02 AM | ${format.color(
          'UPDATE_IN_PROGRESS  ',
          'Green',
        )} | CloudFormation:Stack      | ${format.color(
          format.bold('root stack'),
          'Green',
        )}${EOL}${cll()}3:26:07 AM | ${format.color(
          'UPDATE_IN_PROGRESS  ',
          'Green',
        )} | CloudFormation:Stack      | ${format.color(
          format.bold('∟ data stack'),
          'Green',
        )}${EOL}${cll()}3:26:06 AM | ${format.color(
          'UPDATE_IN_PROGRESS  ',
          'Green',
        )} | CloudFormation:Stack      | ${format.color(
          format.bold('data'),
          'Green',
        )}${EOL}${cll()}3:26:12 AM | ${format.color(
          'UPDATE_IN_PROGRESS  ',
          'Green',
        )} | CloudFormation:Stack      | ${format.color(
          format.bold('∟ Person'),
          'Green',
        )}${EOL}${cll()}3:26:13 AM | ${format.color(
          'UPDATE_IN_PROGRESS  ',
          'Green',
        )} | CloudFormation:Stack      | ${format.color(
          format.bold('∟ Post'),
          'Green',
        )}${EOL}`,
        `${cll()}3:26:02 AM | ${format.color(
          'UPDATE_IN_PROGRESS  ',
          'Green',
        )} | CloudFormation:Stack      | ${format.color(
          format.bold('root stack'),
          'Green',
        )}${EOL}${cll()}3:26:07 AM | ${format.color(
          'UPDATE_IN_PROGRESS  ',
          'Green',
        )} | CloudFormation:Stack      | ${format.color(
          format.bold('∟ data stack'),
          'Green',
        )}${EOL}${cll()}3:26:06 AM | ${format.color(
          'UPDATE_IN_PROGRESS  ',
          'Green',
        )} | CloudFormation:Stack      | ${format.color(
          format.bold('data'),
          'Green',
        )}${EOL}${cll()}3:26:12 AM | ${format.color(
          'UPDATE_IN_PROGRESS  ',
          'Green',
        )} | CloudFormation:Stack      | ${format.color(
          format.bold('∟ Person'),
          'Green',
        )}${EOL}${cll()}3:26:13 AM | ${format.color(
          'UPDATE_IN_PROGRESS  ',
          'Green',
        )} | CloudFormation:Stack      | ${format.color(
          format.bold('∟ Post'),
          'Green',
        )}${EOL}`,
        `${cll()}3:26:18 AM | ${format.color(
          'UPDATE_COMPLETE_CLEA',
          'Green',
        )} | CloudFormation:Stack      | ${format.color(
          format.bold('root stack'),
          'Green',
        )}${EOL}${cll()}3:26:16 AM | ${format.color(
          'UPDATE_COMPLETE_CLEA',
          'Green',
        )} | CloudFormation:Stack      | ${format.color(
          format.bold('∟ data stack'),
          'Green',
        )}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}`,
      ],
    );

    // Spinners
    assert.deepStrictEqual(printerStartSpinnerMock.mock.callCount(), 4);
    assert.deepStrictEqual(
      printerStartSpinnerMock.mock.calls.map((call) => call.arguments[0]),
      [
        'Synthesizing backend...',
        'Running type checks...',
        'Building and publishing assets...',
        'Deployment in progress...',
      ],
    );
    assert.deepStrictEqual(printerStopSpinnerMock.mock.callCount(), 4);
  });

  void it('generates correct events when no change in the app is detected', async () => {
    for (const event of noOpCdkEvents) {
      await classUnderTest.notify(
        event as unknown as AmplifyIoHostEventMessage<unknown>,
      );
    }

    // Typical success messages printed
    assert.deepStrictEqual(printerLogMock.mock.callCount(), 5);
    assert.deepStrictEqual(
      printerLogMock.mock.calls.map((call) => call.arguments[0]),
      [
        format.success('✔') + ' Backend synthesized in 1.9 seconds',
        format.success('✔') + ' Type checks completed in 4.79 seconds',
        format.success('✔') + ' Built and published assets',
        format.success('✔') + ' Deployment completed in 14.053 seconds',
        'AppSync API endpoint = ' +
          format.link(
            'https://32p5frr6ejcm7ddxhrrxherspm.appsync-api.us-west-2.amazonaws.com/graphql',
          ),
      ],
    );

    // CFN progress events (No CFN deployment for this case)
    assert.deepStrictEqual(printerUpdateSpinnerMock.mock.callCount(), 0);

    // Spinners
    assert.deepStrictEqual(printerStartSpinnerMock.mock.callCount(), 4);
    assert.deepStrictEqual(
      printerStartSpinnerMock.mock.calls.map((call) => call.arguments[0]),
      [
        'Synthesizing backend...',
        'Running type checks...',
        'Building and publishing assets...',
        'Deployment in progress...',
      ],
    );
    assert.deepStrictEqual(printerStopSpinnerMock.mock.callCount(), 4);
  });

  void it('generates correct events for a new fully loaded app with auth, storage, function, data and custom stack', async () => {
    for (const event of newAmplifyAppCdkEvents) {
      await classUnderTest.notify(
        event as unknown as AmplifyIoHostEventMessage<unknown>,
      );
    }

    // Typical success messages printed
    assert.deepStrictEqual(printerLogMock.mock.callCount(), 5);
    assert.deepStrictEqual(
      printerLogMock.mock.calls.map((call) => call.arguments[0]),
      [
        format.success('✔') + ' Backend synthesized in 1.91 seconds',
        format.success('✔') + ' Type checks completed in 4.81 seconds',
        format.success('✔') + ' Built and published assets',
        format.success('✔') + ' Deployment completed in 236.434 seconds',
        'AppSync API endpoint = ' +
          format.link(
            'https://ystl6ikbafavph56jdnbbbklmu.appsync-api.us-west-2.amazonaws.com/graphql',
          ),
      ],
    );

    assert.deepStrictEqual(printerUpdateSpinnerMock.mock.callCount(), 42);
    // CFN progress events for a new app, there are too many events, so we assert on 2nd, 10th, 20th 30th and last
    printerUpdateSpinnerMock.mock.calls
      .map((call) => call.arguments[0]?.prefixText)
      .forEach((prefixTextActual, index) => {
        switch (index) {
          case 1:
            assert.deepStrictEqual(
              prefixTextActual,
              `${cll()}3:09:42 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('root stack'),
                'Green',
              )}${EOL}${cll()}3:09:44 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('function'),
                'Green',
              )}${EOL}${cll()}3:09:44 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('MyCustomResources'),
                'Green',
              )}${EOL}`,
            );
            break;
          case 9:
            assert.deepStrictEqual(
              prefixTextActual,
              `${cll()}3:09:42 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('root stack'),
                'Green',
              )}${EOL}${cll()}3:10:20 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('data'),
                'Green',
              )}${EOL}${cll()}3:10:24 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | S3:Bucket                 | ${format.color(
                format.bold('∟ AmplifyCodegenAssetsBucket'),
                'Green',
              )}${EOL}${cll()}3:10:23 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | Lambda:LayerVersion       | ${format.color(
                format.bold('  ∟ AwsCliLayer'),
                'Green',
              )}${EOL}${cll()}3:10:26 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('∟ AmplifyTableManager'),
                'Green',
              )}${EOL}${cll()}3:10:28 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | IAM:Role                  | ${format.color(
                format.bold('  ∟ AmplifyManagedTableIsCompleteRole'),
                'Green',
              )}${EOL}${cll()}3:10:24 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | IAM:Role                  | ${format.color(
                format.bold('  ∟ ServiceRole'),
                'Green',
              )}${EOL}${cll()}3:10:24 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | IAM:Role                  | ${format.color(
                format.bold('  ∟ Role'),
                'Green',
              )}${EOL}${cll()}3:10:26 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | AppSync:GraphQLSchema     | ${format.color(
                format.bold('  ∟ TransformerSchema'),
                'Green',
              )}${EOL}${cll()}3:10:24 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | S3:Bucket                 | ${format.color(
                format.bold('∟ modelIntrospectionSchemaBucket'),
                'Green',
              )}${EOL}${cll()}3:10:23 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | Lambda:LayerVersion       | ${format.color(
                format.bold('  ∟ AwsCliLayer'),
                'Green',
              )}${EOL}${cll()}3:09:45 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('function'),
                'Green',
              )}${EOL}${cll()}3:09:45 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('MyCustomResources'),
                'Green',
              )}${EOL}`,
            );
            break;
          case 19:
            assert.deepStrictEqual(
              prefixTextActual,
              `${cll()}3:09:42 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('root stack'),
                'Green',
              )}${EOL}${cll()}3:10:20 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('data'),
                'Green',
              )}${EOL}${cll()}3:10:26 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('∟ AmplifyTableManager'),
                'Green',
              )}${EOL}${cll()}3:11:15 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | IAM:Policy                | ${format.color(
                format.bold('  ∟ DefaultPolicy'),
                'Green',
              )}${EOL}${cll()}3:10:33 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('storage'),
                'Green',
              )}${EOL}${cll()}3:11:19 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | S3BucketNotifications     | ${format.color(
                format.bold('∟ Notifications'),
                'Green',
              )}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}`,
            );
            break;
          case 29:
            assert.deepStrictEqual(
              prefixTextActual,
              `${cll()}3:09:42 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('root stack'),
                'Green',
              )}${EOL}${cll()}3:10:20 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('data'),
                'Green',
              )}${EOL}${cll()}3:11:44 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('∟ Person'),
                'Green',
              )}${EOL}${cll()}3:12:13 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | AppSync:Resolver          | ${format.color(
                format.bold('  ∟ mutationCreatePersonResolver'),
                'Green',
              )}${EOL}${cll()}3:12:13 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | AppSync:Resolver          | ${format.color(
                format.bold('  ∟ mutationDeletePersonResolver'),
                'Green',
              )}${EOL}${cll()}3:12:13 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | AppSync:Resolver          | ${format.color(
                format.bold('  ∟ mutationUpdatePersonResolver'),
                'Green',
              )}${EOL}${cll()}3:12:13 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | AppSync:Resolver          | ${format.color(
                format.bold('  ∟ queryGetPersonResolver'),
                'Green',
              )}${EOL}${cll()}3:12:13 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | AppSync:Resolver          | ${format.color(
                format.bold('  ∟ queryListPeopleResolver'),
                'Green',
              )}${EOL}${cll()}3:11:44 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('∟ Post'),
                'Green',
              )}${EOL}${cll()}3:11:48 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | AmplifyDynamoDBTable      | ${format.color(
                format.bold('  ∟ Default'),
                'Green',
              )}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}`,
            );
            break;
          case 41:
            assert.deepStrictEqual(
              prefixTextActual,
              `${cll()}3:09:42 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('root stack'),
                'Green',
              )}${EOL}${cll()}3:10:20 AM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('data'),
                'Green',
              )}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}`,
            );
            break;
          default:
            break;
        }
      });

    // Spinners
    assert.deepStrictEqual(printerStartSpinnerMock.mock.callCount(), 4);
    assert.deepStrictEqual(
      printerStartSpinnerMock.mock.calls.map((call) => call.arguments[0]),
      [
        'Synthesizing backend...',
        'Running type checks...',
        'Building and publishing assets...',
        'Deployment in progress...',
      ],
    );
    assert.deepStrictEqual(printerStopSpinnerMock.mock.callCount(), 4);
  });

  void it('generates correct events when storage and function are added to existing stack', async () => {
    for (const event of addFunctionStorageCdkEvents) {
      await classUnderTest.notify(
        event as unknown as AmplifyIoHostEventMessage<unknown>,
      );
    }

    // Typical success messages printed
    assert.deepStrictEqual(printerLogMock.mock.callCount(), 5);
    assert.deepStrictEqual(
      printerLogMock.mock.calls.map((call) => call.arguments[0]),
      [
        format.success('✔') + ' Backend synthesized in 1.94 seconds',
        format.success('✔') + ' Type checks completed in 4.84 seconds',
        format.success('✔') + ' Built and published assets',
        format.success('✔') + ' Deployment completed in 151.384 seconds',
        'AppSync API endpoint = ' +
          format.link(
            'https://ystl6ikbafavph56jdnbbbklmu.appsync-api.us-west-2.amazonaws.com/graphql',
          ),
      ],
    );

    assert.deepStrictEqual(printerUpdateSpinnerMock.mock.callCount(), 24);
    // CFN progress events for updating an app, there are too many events, so we assert on 2nd, 5th, 10th 20th and last
    printerUpdateSpinnerMock.mock.calls
      .map((call) => call.arguments[0]?.prefixText)
      .forEach((prefixTextActual, index) => {
        switch (index) {
          case 1:
            assert.deepStrictEqual(
              prefixTextActual,
              `${cll()}4:01:02 PM | ${format.color(
                'UPDATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('root stack'),
                'Green',
              )}${EOL}`,
            );
            break;
          case 4:
            assert.deepStrictEqual(
              prefixTextActual,
              `${cll()}4:01:02 PM | ${format.color(
                'UPDATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('root stack'),
                'Green',
              )}${EOL}${cll()}4:01:08 PM | ${format.color(
                'UPDATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('∟ data stack'),
                'Green',
              )}${EOL}${cll()}4:01:07 PM | ${format.color(
                'UPDATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('data'),
                'Green',
              )}${EOL}${cll()}4:01:06 PM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('function'),
                'Green',
              )}${EOL}${cll()}4:01:09 PM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | IAM:Role                  | ${format.color(
                format.bold('∟ ServiceRole'),
                'Green',
              )}${EOL}`,
            );
            break;
          case 9:
            assert.deepStrictEqual(
              prefixTextActual,
              `${cll()}4:01:02 PM | ${format.color(
                'UPDATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('root stack'),
                'Green',
              )}${EOL}${cll()}4:01:18 PM | ${format.color(
                'UPDATE_COMPLETE_CLEA',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('∟ data stack'),
                'Green',
              )}${EOL}${cll()}4:01:06 PM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('function'),
                'Green',
              )}${EOL}${cll()}4:01:27 PM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | IAM:Policy                | ${format.color(
                format.bold('∟ DefaultPolicy'),
                'Green',
              )}${EOL}${cll()}${EOL}${cll()}${EOL}`,
            );
            break;
          case 19:
            assert.deepStrictEqual(
              prefixTextActual,
              `${cll()}4:01:02 PM | ${format.color(
                'UPDATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('root stack'),
                'Green',
              )}${EOL}${cll()}4:01:18 PM | ${format.color(
                'UPDATE_COMPLETE_CLEA',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('∟ data stack'),
                'Green',
              )}${EOL}${cll()}4:01:54 PM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('storage'),
                'Green',
              )}${EOL}${cll()}4:02:33 PM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | Lambda:Function           | ${format.color(
                format.bold(
                  '∟ BucketNotificationsHandler050a0587b7544547bf325f094a3db834',
                ),
                'Green',
              )}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}`,
            );
            break;
          case 23:
            assert.deepStrictEqual(
              prefixTextActual,
              `${cll()}4:01:02 PM | ${format.color(
                'UPDATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('root stack'),
                'Green',
              )}${EOL}${cll()}4:01:18 PM | ${format.color(
                'UPDATE_COMPLETE_CLEA',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('∟ data stack'),
                'Green',
              )}${EOL}${cll()}4:01:54 PM | ${format.color(
                'CREATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('storage'),
                'Green',
              )}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}`,
            );
            break;
          default:
            break;
        }
      });

    // Spinners
    assert.deepStrictEqual(printerStartSpinnerMock.mock.callCount(), 4);
    assert.deepStrictEqual(
      printerStartSpinnerMock.mock.calls.map((call) => call.arguments[0]),
      [
        'Synthesizing backend...',
        'Running type checks...',
        'Building and publishing assets...',
        'Deployment in progress...',
      ],
    );
    assert.deepStrictEqual(printerStopSpinnerMock.mock.callCount(), 4);
  });

  void it('generates correct events when storage and function are deleted from existing stack', async () => {
    for (const event of deleteFunctionStorageCdkEvents) {
      await classUnderTest.notify(
        event as unknown as AmplifyIoHostEventMessage<unknown>,
      );
    }

    // Typical success messages printed
    assert.deepStrictEqual(printerLogMock.mock.callCount(), 5);
    assert.deepStrictEqual(
      printerLogMock.mock.calls.map((call) => call.arguments[0]),
      [
        format.success('✔') + ' Backend synthesized in 1.91 seconds',
        format.success('✔') + ' Type checks completed in 4.81 seconds',
        format.success('✔') + ' Built and published assets',
        format.success('✔') + ' Deployment completed in 87.347 seconds',
        'AppSync API endpoint = ' +
          format.link(
            'https://ystl6ikbafavph56jdnbbbklmu.appsync-api.us-west-2.amazonaws.com/graphql',
          ),
      ],
    );

    assert.deepStrictEqual(printerUpdateSpinnerMock.mock.callCount(), 12);
    // CFN progress events for updating an app, there are too many events, so we assert on 2nd, 5th, 7th, 10th and last
    printerUpdateSpinnerMock.mock.calls
      .map((call) => call.arguments[0]?.prefixText)
      .forEach((prefixTextActual, index) => {
        switch (index) {
          case 1:
            assert.deepStrictEqual(
              prefixTextActual,
              `${cll()}3:20:31 AM | ${format.color(
                'UPDATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('root stack'),
                'Green',
              )}${EOL}`,
            );
            break;
          case 4:
            assert.deepStrictEqual(
              prefixTextActual,
              `${cll()}3:20:31 AM | ${format.color(
                'UPDATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('root stack'),
                'Green',
              )}${EOL}${cll()}3:20:45 AM | ${format.color(
                'UPDATE_COMPLETE_CLEA',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('∟ data stack'),
                'Green',
              )}${EOL}${cll()}${EOL}`,
            );
            break;
          case 7:
            assert.deepStrictEqual(
              prefixTextActual,
              `${cll()}3:20:47 AM | ${format.color(
                'UPDATE_COMPLETE_CLEA',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('root stack'),
                'Green',
              )}${EOL}${cll()}3:20:48 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('storage0EC3F24A'),
                'Yellow',
              )}${EOL}${cll()}3:20:48 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('∟ storage stack'),
                'Yellow',
              )}${EOL}${cll()}3:20:59 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | IAM:Role                  | ${format.color(
                format.bold('  ∟ Role'),
                'Yellow',
              )}${EOL}${cll()}3:20:59 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | IAM:Role                  | ${format.color(
                format.bold(
                  'BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleB6FB88EC',
                ),
                'Yellow',
              )}${EOL}`,
            );
            break;
          case 9:
            assert.deepStrictEqual(
              prefixTextActual,
              `${cll()}3:20:47 AM | ${format.color(
                'UPDATE_COMPLETE_CLEA',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('root stack'),
                'Green',
              )}${EOL}${cll()}3:21:10 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('function1351588B'),
                'Yellow',
              )}${EOL}${cll()}3:21:10 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('∟ function stack'),
                'Yellow',
              )}${EOL}${cll()}3:21:16 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | IAM:Role                  | ${format.color(
                format.bold('sayhellolambdaServiceRole4BCAA6E2'),
                'Yellow',
              )}${EOL}${cll()}${EOL}`,
            );
            break;

          case 11:
            assert.deepStrictEqual(
              prefixTextActual,
              `${cll()}3:20:47 AM | ${format.color(
                'UPDATE_COMPLETE_CLEA',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('root stack'),
                'Green',
              )}${EOL}${cll()}3:21:10 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('function1351588B'),
                'Yellow',
              )}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}`,
            );
            break;
          default:
            break;
        }
      });

    // Spinners
    assert.deepStrictEqual(printerStartSpinnerMock.mock.callCount(), 4);
    assert.deepStrictEqual(
      printerStartSpinnerMock.mock.calls.map((call) => call.arguments[0]),
      [
        'Synthesizing backend...',
        'Running type checks...',
        'Building and publishing assets...',
        'Deployment in progress...',
      ],
    );
    assert.deepStrictEqual(printerStopSpinnerMock.mock.callCount(), 4);
  });

  void it('generates correct events when fully loaded app is deleted', async () => {
    for (const event of destroyAppCdkEvents) {
      await classUnderTest.notify(
        event as unknown as AmplifyIoHostEventMessage<unknown>,
      );
    }

    // Backend synthesized or TS checks are not run on destroy
    assert.deepStrictEqual(printerLogMock.mock.callCount(), 0);

    assert.deepStrictEqual(printerUpdateSpinnerMock.mock.callCount(), 26);
    // CFN progress events for updating an app, there are too many events, so we assert on 2nd, 5th, 10th 19th and last
    printerUpdateSpinnerMock.mock.calls
      .map((call) => call.arguments[0]?.prefixText)
      .forEach((prefixTextActual, index) => {
        switch (index) {
          case 1:
            assert.deepStrictEqual(
              prefixTextActual,
              `${cll()}3:05:29 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('root stack'),
                'Yellow',
              )}${EOL}`,
            );
            break;
          case 4:
            assert.deepStrictEqual(
              prefixTextActual,
              `${cll()}3:05:29 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('root stack'),
                'Yellow',
              )}${EOL}${cll()}3:05:32 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('∟ data stack'),
                'Yellow',
              )}${EOL}${cll()}3:05:32 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('∟ MyCustomResources stack'),
                'Yellow',
              )}${EOL}${cll()}3:05:32 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('∟ storage stack'),
                'Yellow',
              )}${EOL}${cll()}3:05:31 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('data'),
                'Yellow',
              )}${EOL}${cll()}3:05:41 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | Lambda:LayerVersion       | ${format.color(
                format.bold('∟ AwsCliLayer'),
                'Yellow',
              )}${EOL}${cll()}3:05:34 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('∟ ConnectionStack'),
                'Yellow',
              )}${EOL}${cll()}3:05:41 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | IAM:Policy                | ${format.color(
                format.bold('  ∟ DefaultPolicy'),
                'Yellow',
              )}${EOL}${cll()}3:05:39 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | Lambda:Function           | ${format.color(
                format.bold('  ∟ Handler'),
                'Yellow',
              )}${EOL}${cll()}3:05:31 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('MyCustomResources'),
                'Yellow',
              )}${EOL}${cll()}3:05:33 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | SQS:Queue                 | ${format.color(
                format.bold('∟ CustomQueue'),
                'Yellow',
              )}${EOL}${cll()}3:05:33 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | SNS:Topic                 | ${format.color(
                format.bold('∟ CustomTopics'),
                'Yellow',
              )}${EOL}${cll()}3:05:31 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('storage'),
                'Yellow',
              )}${EOL}${cll()}3:05:37 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | Lambda:Function           | ${format.color(
                format.bold(
                  '∟ BucketNotificationsHandler050a0587b7544547bf325f094a3db834',
                ),
                'Yellow',
              )}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}`,
            );
            break;
          case 9:
            assert.deepStrictEqual(
              prefixTextActual,
              `${cll()}3:05:29 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('root stack'),
                'Yellow',
              )}${EOL}${cll()}3:05:32 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('∟ data stack'),
                'Yellow',
              )}${EOL}${cll()}3:05:32 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('∟ MyCustomResources stack'),
                'Yellow',
              )}${EOL}${cll()}3:05:31 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('data'),
                'Yellow',
              )}${EOL}${cll()}3:05:45 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('∟ Person'),
                'Yellow',
              )}${EOL}${cll()}3:05:53 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('function'),
                'Yellow',
              )}${EOL}${cll()}3:05:31 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('MyCustomResources'),
                'Yellow',
              )}${EOL}${cll()}3:05:33 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | SNS:Topic                 | ${format.color(
                format.bold('∟ CustomTopics'),
                'Yellow',
              )}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}`,
            );
            break;
          case 19:
            assert.deepStrictEqual(
              prefixTextActual,
              `${cll()}3:05:29 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('root stack'),
                'Yellow',
              )}${EOL}${cll()}3:05:31 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('data'),
                'Yellow',
              )}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}`,
            );
            break;
          case 25:
            assert.deepStrictEqual(
              prefixTextActual,
              `${cll()}3:05:29 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('root stack'),
                'Yellow',
              )}${EOL}${cll()}3:07:25 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('∟ auth stack'),
                'Yellow',
              )}${EOL}${cll()}3:07:25 AM | ${format.color(
                'DELETE_IN_PROGRESS  ',
                'Yellow',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('auth'),
                'Yellow',
              )}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}${cll()}${EOL}`,
            );
            break;
          default:
            break;
        }
      });

    // Spinners
    assert.deepStrictEqual(printerStartSpinnerMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      printerStartSpinnerMock.mock.calls.map((call) => call.arguments[0]),
      ['Deployment in progress...'],
    );
    assert.deepStrictEqual(printerStopSpinnerMock.mock.callCount(), 1);
  });

  void it('generates correct events when cfn deployment has failed', async () => {
    for (const event of failedCfnDeploymentCdkEvents) {
      await classUnderTest.notify(
        event as unknown as AmplifyIoHostEventMessage<unknown>,
      );
    }

    // Typical success messages printed
    assert.deepStrictEqual(printerLogMock.mock.callCount(), 3);
    assert.deepStrictEqual(
      printerLogMock.mock.calls.map((call) => call.arguments[0]),
      [
        format.success('✔') + ' Backend synthesized in 1.5 seconds',
        format.success('✔') + ' Type checks completed in 5.04 seconds',
        format.success('✔') + ' Built and published assets',
      ],
    );

    assert.deepStrictEqual(printerUpdateSpinnerMock.mock.callCount(), 8);
    // CFN progress events for updating an app, there are too many events, so we assert on 2nd, 4th, 6th, last
    printerUpdateSpinnerMock.mock.calls
      .map((call) => call.arguments[0]?.prefixText)
      .forEach((prefixTextActual, index) => {
        switch (index) {
          case 1:
            assert.deepStrictEqual(
              prefixTextActual,
              `${cll()}3:31:09 AM | ${format.color(
                'UPDATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('root stack'),
                'Green',
              )}${EOL}`,
            );
            break;
          case 3:
            assert.deepStrictEqual(
              prefixTextActual,
              `${cll()}3:31:09 AM | ${format.color(
                'UPDATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('root stack'),
                'Green',
              )}${EOL}${cll()}3:31:17 AM | ${format.color(
                'UPDATE_ROLLBACK_IN_P',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('∟ auth stack'),
                'Green',
              )}${EOL}${cll()}3:31:12 AM | ${format.color(
                'UPDATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('auth'),
                'Green',
              )}${EOL}${cll()}3:31:17 AM | ${format.color(
                'UPDATE_FAILED       ',
                'Red',
              )} | Cognito:UserPool          | ${format.color(
                format.bold('∟ UserPool'),
                'Red',
              )}${EOL}${cll()}${format.color(
                'Resource handler returned message: "Cognito received the following error from Amazon SES when attempting to send email: Email address is not verified. The following identities failed the check in region US-WEST-2: arn:aws:ses:us-west-2:504152962427:identity/blah@blah.com (Service: CognitoIdentityProvider, Status Code: 400, Request ID: 3bf35a6e-9667-4baf-8eab-19676643ac8d)" (RequestToken: 8c4cec48-3f40-7c73-a8b6-3afc0314b029, HandlerErrorCode: InvalidRequest)',
                'Red',
              )}${EOL}`,
            );
            break;
          case 5:
            assert.deepStrictEqual(
              prefixTextActual,
              `${cll()}3:31:23 AM | ${format.color(
                'UPDATE_ROLLBACK_IN_P',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('root stack'),
                'Green',
              )}${EOL}${cll()}3:31:33 AM | ${format.color(
                'UPDATE_ROLLBACK_COMP',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('∟ auth stack'),
                'Green',
              )}${EOL}${cll()}3:31:25 AM | ${format.color(
                'UPDATE_IN_PROGRESS  ',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('auth'),
                'Green',
              )}${EOL}${cll()}3:31:17 AM | ${format.color(
                'UPDATE_FAILED       ',
                'Red',
              )} | Cognito:UserPool          | ${format.color(
                format.bold('∟ UserPool'),
                'Red',
              )}${EOL}${cll()}${format.color(
                'Resource handler returned message: "Cognito received the following error from Amazon SES when attempting to send email: Email address is not verified. The following identities failed the check in region US-WEST-2: arn:aws:ses:us-west-2:504152962427:identity/blah@blah.com (Service: CognitoIdentityProvider, Status Code: 400, Request ID: 3bf35a6e-9667-4baf-8eab-19676643ac8d)" (RequestToken: 8c4cec48-3f40-7c73-a8b6-3afc0314b029, HandlerErrorCode: InvalidRequest)',
                'Red',
              )}${EOL}`,
            );
            break;
          case 7:
            assert.deepStrictEqual(
              prefixTextActual,
              `${cll()}3:31:36 AM | ${format.color(
                'UPDATE_ROLLBACK_COMP',
                'Green',
              )} | CloudFormation:Stack      | ${format.color(
                format.bold('root stack'),
                'Green',
              )}${EOL}${cll()}3:31:17 AM | ${format.color(
                'UPDATE_FAILED       ',
                'Red',
              )} | Cognito:UserPool          | ${format.color(
                format.bold('∟ UserPool'),
                'Red',
              )}${EOL}${cll()}${format.color(
                'Resource handler returned message: "Cognito received the following error from Amazon SES when attempting to send email: Email address is not verified. The following identities failed the check in region US-WEST-2: arn:aws:ses:us-west-2:504152962427:identity/blah@blah.com (Service: CognitoIdentityProvider, Status Code: 400, Request ID: 3bf35a6e-9667-4baf-8eab-19676643ac8d)" (RequestToken: 8c4cec48-3f40-7c73-a8b6-3afc0314b029, HandlerErrorCode: InvalidRequest)',
                'Red',
              )}${EOL}${cll()}${EOL}${cll()}${EOL}`,
            );
            break;
          default:
            break;
        }
      });

    // Spinners
    assert.deepStrictEqual(printerStartSpinnerMock.mock.callCount(), 4);
    assert.deepStrictEqual(
      printerStartSpinnerMock.mock.calls.map((call) => call.arguments[0]),
      [
        'Synthesizing backend...',
        'Running type checks...',
        'Building and publishing assets...',
        'Deployment in progress...',
      ],
    );
    assert.deepStrictEqual(printerStopSpinnerMock.mock.callCount(), 4);
  });

  /**
   * Clear to the end of line
   */
  const cll = () => {
    return '\x1B[K';
  };
});
