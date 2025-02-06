// import { after, afterEach, before, describe, mock, test } from 'node:test';
// import assert from 'node:assert';
// import { DefaultTelemetryDataEmitter } from './telemetry_data_emitter';
// import { v4, validate } from 'uuid';
// import url from 'url';
// import https from 'https';
// import http from 'http';
// import fs from 'fs';
// import os from 'os';
// import { TelemetryData, TelemetryEventState } from './telemetry_data';
// import isCI from 'is-ci';
// import { AmplifyError, AmplifyUserError } from '..';
// import { RegionFetcher } from './region_fetcher';

// const originalNpmUserAgent = process.env.npm_config_user_agent;
// const testNpmUserAgent = 'testNpmUserAgent';

// void describe('TelemetryDataEmitter', () => {
//   let telemetryDataEmitter: DefaultTelemetryDataEmitter;

//   const testDependencies = [
//     {
//       name: '@aws-amplify/backend',
//       version: '1.4.0',
//     },
//     {
//       name: '@aws-amplify/backend-cli',
//       version: '1.4.1',
//     },
//     {
//       name: 'aws-cdk',
//       version: '1.2.3',
//     },
//     {
//       name: 'aws-cdk-lib',
//       version: '12.13.14',
//     },
//     {
//       name: 'test-dep',
//       version: '1.2.4',
//     },
//     {
//       name: 'some_other_dep',
//       version: '12.12.14',
//     },
//   ];
//   const onReqEndMock = mock.fn();
//   const onReqWriteMock = mock.fn();
//   const reqMock = {
//     setTimeout: mock.fn(),
//     on: mock.fn(),
//     write: onReqWriteMock,
//     end: onReqEndMock,
//   } as unknown as http.ClientRequest;

//   // For getlocalProjectUuid which retrieves it from PackageJsonReader
//   mock.method(fs, 'existsSync', () => true);
//   mock.method(fs, 'readFile', () =>
//     Promise.resolve(JSON.stringify({ name: 'testAppName' }))
//   );

//   // For RegionFetcher
//   const regionFetcherMock = {
//     fetch: async () => 'us-east-1',
//   } as RegionFetcher;

//   mock.method(https, 'request', () => reqMock);

//   before(() => {
//     process.env.npm_config_user_agent = testNpmUserAgent;
//   });

//   after(() => {
//     process.env.npm_config_user_agent = originalNpmUserAgent;
//   });

//   afterEach(() => {
//     onReqEndMock.mock.resetCalls();
//     onReqEndMock.mock.restore();
//     onReqWriteMock.mock.resetCalls();
//     onReqWriteMock.mock.restore();
//   });

//   void test('happy case, emitSuccess generates and send correct telemetry data', async () => {
//     await setupAndInvokeUsageEmitter({
//       state: TelemetryEventState.SUCCEEDED,
//       metrics: { synthesisTime: 5, totalTime: 20 },
//     });

//     const telemetryDataSent: TelemetryData = JSON.parse(
//       onReqWriteMock.mock.calls[0].arguments[0]
//     );

//     assert.strictEqual(telemetryDataSent.identifiers.payloadVersion, '1.0.0');
//     assert.ok(validate(telemetryDataSent.identifiers.sessionUuid));
//     assert.ok(validate(telemetryDataSent.identifiers.localProjectId));
//     assert.strictEqual(telemetryDataSent.identifiers.awsRegion, 'us-east-1');
//     assert.strictEqual(telemetryDataSent.event.state, 'SUCCEEDED');
//     assert.deepStrictEqual(telemetryDataSent.event.command, {
//       path: ['testCommandName'],
//       parameters: ['testOption1', 'testOption2'],
//     });
//     assert.deepStrictEqual(telemetryDataSent.environment.os, {
//       platform: os.platform(),
//       release: os.release(),
//     });
//     assert.strictEqual(telemetryDataSent.environment.shell, os.userInfo().shell);
//     assert.strictEqual(telemetryDataSent.environment.npmUserAgent, testNpmUserAgent);
//     assert.strictEqual(telemetryDataSent.environment.ci, isCI);
//     assert.deepStrictEqual(telemetryDataSent.project.dependencies, [
//       {
//         name: '@aws-amplify/backend',
//         version: '1.4.0',
//       },
//       {
//         name: '@aws-amplify/backend-cli',
//         version: '1.4.1',
//       },
//       {
//         name: 'aws-cdk',
//         version: '1.2.3',
//       },
//       {
//         name: 'aws-cdk-lib',
//         version: '12.13.14',
//       },
//     ]);
//     assert.deepStrictEqual(telemetryDataSent.latency, {
//       total: 20,
//       synthesis: 5
//     })
//     assert.strictEqual(telemetryDataSent.error, undefined);
//   });

//   void test('happy case, emitFailure generates and send correct usage data', async () => {
//     const error = new AmplifyUserError(
//       'BackendBuildError',
//       {
//         message: 'some error message',
//         resolution: 'test resolution',
//       },
//       new Error('some downstream exception')
//     );
//     await setupAndInvokeUsageEmitter({ state: TelemetryEventState.FAILED, error, metrics: { synthesisTime: 5, totalTime: 20, initTime: 2, deploymentTime: 13, hotSwapTime: 0 } });

//     const telemetryDataSent: TelemetryData = JSON.parse(
//       onReqWriteMock.mock.calls[0].arguments[0]
//     );

//     assert.strictEqual(telemetryDataSent.identifiers.payloadVersion, '1.0.0');
//     assert.ok(validate(telemetryDataSent.identifiers.sessionUuid));
//     assert.ok(validate(telemetryDataSent.identifiers.localProjectId));
//     assert.strictEqual(telemetryDataSent.identifiers.awsRegion, 'us-east-1');
//     assert.strictEqual(telemetryDataSent.event.state, 'FAILED');
//     assert.deepStrictEqual(telemetryDataSent.event.command, {
//       path: ['testCommandName'],
//       parameters: ['testOption1', 'testOption2'],
//     });
//     assert.deepStrictEqual(telemetryDataSent.environment.os, {
//       platform: os.platform(),
//       release: os.release(),
//     });
//     assert.strictEqual(telemetryDataSent.environment.shell, os.userInfo().shell);
//     assert.strictEqual(telemetryDataSent.environment.npmUserAgent, testNpmUserAgent);
//     assert.strictEqual(telemetryDataSent.environment.ci, isCI);
//     assert.deepStrictEqual(telemetryDataSent.project.dependencies, [
//       {
//         name: '@aws-amplify/backend',
//         version: '1.4.0',
//       },
//       {
//         name: '@aws-amplify/backend-cli',
//         version: '1.4.1',
//       },
//       {
//         name: 'aws-cdk',
//         version: '1.2.3',
//       },
//       {
//         name: 'aws-cdk-lib',
//         version: '12.13.14',
//       },
//     ]);
//     assert.deepStrictEqual(telemetryDataSent.latency, {
//       total: 20,
//       init: 2,
//       deployment: 13,
//       synthesis: 5,
//       hotSwap: 0,
//     });
//     assert.strictEqual(telemetryDataSent.error?.message, 'some error message');
//     assert.strictEqual(telemetryDataSent.error.cause?.message, 'some downstream exception');
//   });

//   /**
//    * Lots of acrobatics done here to be able to mock nodejs https library (which doesn't support promises)
//    * and node:test library which doesn't have the best mocking mechanism.
//    *
//    * 1. Create a mock for https and override the 4 methods called in the class under test
//    * 2. Add a hook in the `req.end()` event handler implementation so we know when the listener is available to grab
//    * 3. Grab the event listener attached in the `req.end()` event handler
//    * 4. Call the listener which signifies that the request is completed and the Promise in the code would resolve
//    * 5. Now get hold of all the event handlers for assertions.
//    */
//   const setupAndInvokeUsageEmitter = async (testData: {
//     state: TelemetryEventState;
//     error?: AmplifyError;
//     metrics?: Record<string, number>;
//   }) => {
//     const reqEndHandlerAttached = new Promise<void>((resolve) => {
//       onReqEndMock.mock.mockImplementationOnce(() => {
//         resolve();
//       });
//     });

//     telemetryDataEmitter = new DefaultTelemetryDataEmitter(
//       testDependencies,
//       v4(),
//       regionFetcherMock,
//     );

//     let telemetryDataEmitterPromise;
//     if (testData.state === TelemetryEventState.SUCCEEDED) {
//       telemetryDataEmitterPromise = telemetryDataEmitter.emitSuccess(testData.metrics, {
//         subCommands: 'testCommandName',
//         options: 'testOption1 testOption2'
//       });
//     } else if (testData.error) {
//       telemetryDataEmitterPromise = telemetryDataEmitter.emitFailure(testData.error,
//         testData.metrics,
//         {
//         subCommands: 'testCommandName',
//         options: 'testOption1 testOption2'
//       });
//     }

//     await reqEndHandlerAttached;
//     const onReqEndCallBackFn = onReqEndMock.mock.calls[0].arguments[0];
//     // Signify that it is the end of the request
//     onReqEndCallBackFn();
//     await telemetryDataEmitterPromise;
//   };
// });
