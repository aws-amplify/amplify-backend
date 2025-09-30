import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import assert from 'node:assert';
import { after, afterEach, before, describe, it, mock } from 'node:test';
import http from 'http';
import https from 'https';
import os from 'os';
import url from 'url';
import { v4 as uuidV4, validate } from 'uuid';
import { DefaultTelemetryPayloadExporter } from './telemetry_payload_exporter';
import { TelemetryPayload } from './telemetry_payload';
import { AccountIdFetcher } from './account_id_fetcher';
import { RegionFetcher } from './region_fetcher';
import isCI from 'is-ci';
import { ExportResultCode } from '@opentelemetry/core';
import { telemetrySpanAttributeCountLimit } from './constants';

void describe('DefaultTelemetryPayloadExporter', () => {
  let telemetryPayloadExporter: DefaultTelemetryPayloadExporter;

  const originalNpmUserAgent = process.env.npm_config_user_agent;
  const testNpmUserAgent = 'testNpmUserAgent';

  const testPayloadVersion = '1.2.3';
  const testDependencies = [
    {
      name: 'aws-cdk',
      version: '1.2.3',
    },
    {
      name: 'aws-cdk-lib',
      version: '12.13.14',
    },
    {
      name: 'test-dep',
      version: '1.2.4',
    },
    {
      name: 'some_other_dep',
      version: '12.12.14',
    },
  ];

  const testURL = url.parse('https://aws.amazon.com/amplify/');
  const onReqEndMock = mock.fn();
  const onReqWriteMock = mock.fn();
  const reqMock = {
    setTimeout: mock.fn(),
    on: mock.fn(),
    write: onReqWriteMock,
    end: onReqEndMock,
  } as unknown as http.ClientRequest;

  mock.method(https, 'request', () => reqMock);

  // Mock callback
  const mockResultCallback = mock.fn();

  // For AccountIdFetcher
  const accountIdFetcherMock = {
    fetch: async () => uuidV4(),
  } as AccountIdFetcher;

  // For RegionFetcher
  const regionFetcherMock = {
    fetch: async () => 'us-east-1',
  } as RegionFetcher;

  const mockSpan = {
    attributes: {
      'event.state': 'SUCCEEDED',
      'event.command.path': ['command1'],
      'event.command.parameters': ['option1', 'option2'],
      'latency.total': 1000,
      'latency.init': 10,
      'latency.synthesis': 250,
      'latency.deployment': 740,
    },
    name: 'test-span',
    spanContext: () => ({
      traceId: 'test-trace-id',
      spanId: 'test-span-id',
      traceFlags: 1,
    }),
    duration: [1, 0],
    startTime: [0, 0],
    endTime: [1, 0],
    ended: true,
    kind: 0,
    parentSpanId: undefined,
    status: { code: 0 },
    events: [],
    links: [],
    instrumentationLibrary: { name: 'test', version: '1.0.0' },
    resource: { attributes: {} },
    droppedAttributesCount: 0,
    droppedEventsCount: 0,
    droppedLinksCount: 0,
  } as unknown as ReadableSpan;

  before(() => {
    process.env.npm_config_user_agent = testNpmUserAgent;
  });

  after(() => {
    process.env.npm_config_user_agent = originalNpmUserAgent;
  });

  afterEach(() => {
    onReqEndMock.mock.resetCalls();
    onReqEndMock.mock.restore();
    onReqWriteMock.mock.resetCalls();
    onReqWriteMock.mock.restore();
    mockResultCallback.mock.resetCalls();
  });

  void it('successfully sends telemetry payload', async () => {
    await setUpAndSendTelemetryPayload(mockSpan);
    const telemetryPayloadSent: TelemetryPayload = JSON.parse(
      onReqWriteMock.mock.calls[0].arguments[0],
    );

    assert.strictEqual(
      telemetryPayloadSent.identifiers.payloadVersion,
      testPayloadVersion,
    );
    assert.ok(validate(telemetryPayloadSent.identifiers.sessionUuid));
    assert.notEqual(
      telemetryPayloadSent.identifiers.sessionUuid,
      telemetryPayloadSent.identifiers.eventId,
    );
    assert.ok(validate(telemetryPayloadSent.identifiers.eventId));
    assert.ok(validate(telemetryPayloadSent.identifiers.localProjectId));
    assert.ok(validate(telemetryPayloadSent.identifiers.accountId!));
    assert.strictEqual(telemetryPayloadSent.identifiers.awsRegion, 'us-east-1');
    assert.strictEqual(telemetryPayloadSent.event.state, 'SUCCEEDED');
    assert.deepStrictEqual(telemetryPayloadSent.event.command.path, [
      'command1',
    ]);
    assert.deepStrictEqual(telemetryPayloadSent.event.command.parameters, [
      'option1',
      'option2',
    ]);
    assert.strictEqual(
      telemetryPayloadSent.environment.os.platform,
      os.platform(),
    );
    assert.strictEqual(
      telemetryPayloadSent.environment.os.release,
      os.release(),
    );
    assert.strictEqual(
      telemetryPayloadSent.environment.shell,
      os.userInfo().shell ?? '',
    );
    assert.strictEqual(
      telemetryPayloadSent.environment.npmUserAgent,
      testNpmUserAgent,
    );
    assert.strictEqual(telemetryPayloadSent.environment.ci, isCI);
    assert.ok(telemetryPayloadSent.environment.memory.total);
    assert.ok(telemetryPayloadSent.environment.memory.free);
    assert.deepStrictEqual(telemetryPayloadSent.project.dependencies, [
      {
        name: 'aws-cdk',
        version: '1.2.3',
      },
      {
        name: 'aws-cdk-lib',
        version: '12.13.14',
      },
    ]);
    assert.strictEqual(telemetryPayloadSent.latency.total, 1000);
    assert.strictEqual(telemetryPayloadSent.latency.init, 10);
    assert.strictEqual(telemetryPayloadSent.latency.synthesis, 250);
    assert.strictEqual(telemetryPayloadSent.latency.deployment, 740);
    assert.deepStrictEqual(mockResultCallback.mock.calls[0].arguments[0], {
      code: ExportResultCode.SUCCESS,
    });
  });

  void it('successfully sends telemetry payload with error data', async () => {
    const mockSpanWithError = {
      ...mockSpan,
      attributes: {
        ...mockSpan.attributes,
        'event.state': 'FAILED',
        'error.name': 'test error',
        'error.message': 'test error message',
        'error.stack': 'test error stack',
      },
    };
    await setUpAndSendTelemetryPayload(mockSpanWithError);
    const telemetryPayloadSent: TelemetryPayload = JSON.parse(
      onReqWriteMock.mock.calls[0].arguments[0],
    );

    assert.strictEqual(
      telemetryPayloadSent.identifiers.payloadVersion,
      testPayloadVersion,
    );
    assert.ok(validate(telemetryPayloadSent.identifiers.sessionUuid));
    assert.notEqual(
      telemetryPayloadSent.identifiers.sessionUuid,
      telemetryPayloadSent.identifiers.eventId,
    );
    assert.ok(validate(telemetryPayloadSent.identifiers.eventId));
    assert.ok(validate(telemetryPayloadSent.identifiers.localProjectId));
    assert.ok(validate(telemetryPayloadSent.identifiers.accountId!));
    assert.strictEqual(telemetryPayloadSent.identifiers.awsRegion, 'us-east-1');
    assert.strictEqual(telemetryPayloadSent.event.state, 'FAILED');
    assert.deepStrictEqual(telemetryPayloadSent.event.command.path, [
      'command1',
    ]);
    assert.deepStrictEqual(telemetryPayloadSent.event.command.parameters, [
      'option1',
      'option2',
    ]);
    assert.strictEqual(
      telemetryPayloadSent.environment.os.platform,
      os.platform(),
    );
    assert.strictEqual(
      telemetryPayloadSent.environment.os.release,
      os.release(),
    );
    assert.strictEqual(
      telemetryPayloadSent.environment.shell,
      os.userInfo().shell ?? '',
    );
    assert.strictEqual(
      telemetryPayloadSent.environment.npmUserAgent,
      testNpmUserAgent,
    );
    assert.strictEqual(telemetryPayloadSent.environment.ci, isCI);
    assert.ok(telemetryPayloadSent.environment.memory.total);
    assert.ok(telemetryPayloadSent.environment.memory.free);
    assert.deepStrictEqual(telemetryPayloadSent.project.dependencies, [
      {
        name: 'aws-cdk',
        version: '1.2.3',
      },
      {
        name: 'aws-cdk-lib',
        version: '12.13.14',
      },
    ]);
    assert.strictEqual(telemetryPayloadSent.latency.total, 1000);
    assert.strictEqual(telemetryPayloadSent.latency.init, 10);
    assert.strictEqual(telemetryPayloadSent.latency.synthesis, 250);
    assert.strictEqual(telemetryPayloadSent.latency.deployment, 740);
    assert.strictEqual(telemetryPayloadSent.error?.name, 'test error');
    assert.strictEqual(
      telemetryPayloadSent.error.message,
      'test error message',
    );
    assert.strictEqual(telemetryPayloadSent.error.stack, 'test error stack');
    assert.deepStrictEqual(mockResultCallback.mock.calls[0].arguments[0], {
      code: ExportResultCode.SUCCESS,
    });
  });

  void it('sends bare bones span with error when span is at attribute count limit', async () => {
    const spanAttributes: Record<string, string> = {};
    for (let i = 0; i < telemetrySpanAttributeCountLimit; i++) {
      spanAttributes[`attribute${i}`] = `attributeValue${i}`;
    }
    const mockSpanWithMaxAttributes = {
      ...mockSpan,
      attributes: {
        ...spanAttributes,
      },
    };

    await setUpAndSendTelemetryPayload(mockSpanWithMaxAttributes);
    const telemetryPayloadSent: TelemetryPayload = JSON.parse(
      onReqWriteMock.mock.calls[0].arguments[0],
    );

    assert.strictEqual(
      telemetryPayloadSent.identifiers.payloadVersion,
      testPayloadVersion,
    );
    assert.ok(validate(telemetryPayloadSent.identifiers.sessionUuid));
    assert.notEqual(
      telemetryPayloadSent.identifiers.sessionUuid,
      telemetryPayloadSent.identifiers.eventId,
    );
    assert.ok(validate(telemetryPayloadSent.identifiers.eventId));
    assert.ok(validate(telemetryPayloadSent.identifiers.localProjectId));
    assert.ok(validate(telemetryPayloadSent.identifiers.accountId!));
    assert.strictEqual(telemetryPayloadSent.identifiers.awsRegion, 'us-east-1');
    assert.strictEqual(telemetryPayloadSent.event.state, 'FAILED');
    assert.deepStrictEqual(telemetryPayloadSent.event.command.path, []);
    assert.deepStrictEqual(telemetryPayloadSent.event.command.parameters, []);
    assert.strictEqual(
      telemetryPayloadSent.environment.os.platform,
      os.platform(),
    );
    assert.strictEqual(
      telemetryPayloadSent.environment.os.release,
      os.release(),
    );
    assert.strictEqual(
      telemetryPayloadSent.environment.shell,
      os.userInfo().shell ?? '',
    );
    assert.strictEqual(
      telemetryPayloadSent.environment.npmUserAgent,
      testNpmUserAgent,
    );
    assert.strictEqual(telemetryPayloadSent.environment.ci, isCI);
    assert.ok(telemetryPayloadSent.environment.memory.total);
    assert.ok(telemetryPayloadSent.environment.memory.free);
    assert.deepStrictEqual(telemetryPayloadSent.project.dependencies, [
      {
        name: 'aws-cdk',
        version: '1.2.3',
      },
      {
        name: 'aws-cdk-lib',
        version: '12.13.14',
      },
    ]);
    assert.strictEqual(telemetryPayloadSent.latency.total, 0);
    assert.strictEqual(telemetryPayloadSent.latency.init, undefined);
    assert.strictEqual(telemetryPayloadSent.latency.synthesis, undefined);
    assert.strictEqual(telemetryPayloadSent.latency.deployment, undefined);
    assert.strictEqual(
      telemetryPayloadSent.error?.name,
      'TelemetrySpanAttributeCountLimitFault',
    );
    assert.strictEqual(
      telemetryPayloadSent.error.message,
      `Telemetry span attribute count has hit the limit of ${telemetrySpanAttributeCountLimit}`,
    );
    assert.ok(telemetryPayloadSent.error.stack);
    assert.deepStrictEqual(mockResultCallback.mock.calls[0].arguments[0], {
      code: ExportResultCode.SUCCESS,
    });
  });

  /**
   * Lots of acrobatics done here to be able to mock nodejs https library (which doesn't support promises)
   * and node:test library which doesn't have the best mocking mechanism.
   *
   * 1. Create a mock for https and override the 4 methods called in the class under test
   * 2. Add a hook in the `req.end()` event handler implementation so we know when the listener is available to grab
   * 3. Grab the event listener attached in the `req.end()` event handler
   * 4. Call the listener which signifies that the request is completed and the Promise in the code would resolve
   * 5. Now get hold of all the event handlers for assertions.
   */
  const setUpAndSendTelemetryPayload = async (span: ReadableSpan) => {
    const reqEndHandlerAttached = new Promise<void>((resolve) => {
      onReqEndMock.mock.mockImplementationOnce(() => {
        resolve();
      });
    });

    telemetryPayloadExporter = new DefaultTelemetryPayloadExporter(
      testDependencies,
      testPayloadVersion,
      undefined,
      testURL,
      accountIdFetcherMock,
      regionFetcherMock,
    );
    const telemetryPayloadExporterPromise = telemetryPayloadExporter.export(
      [span],
      mockResultCallback,
    );

    await reqEndHandlerAttached;
    const onReqEndCallBackFn = onReqEndMock.mock.calls[0].arguments[0];
    // Signify that it is the end of the request
    onReqEndCallBackFn();
    await telemetryPayloadExporterPromise;
  };
});
