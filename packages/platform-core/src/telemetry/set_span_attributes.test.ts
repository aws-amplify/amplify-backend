import { AttributeValue, Span, SpanContext } from '@opentelemetry/api';
import { beforeEach, describe, it, mock } from 'node:test';
import { setSpanAttributes } from './set_span_attributes';
import assert from 'node:assert';
import { TelemetryPayload } from './telemetry_payload';
import { DeepPartial } from '@aws-amplify/plugin-types';

void describe('setSpanAttributes', () => {
  const setAttributeMock =
    mock.fn<(key: string, value: AttributeValue) => Span>();

  const mockSpan: Span = {
    setAttribute: setAttributeMock,
    spanContext(): SpanContext {
      return {
        traceId: 'test-trace-id',
        spanId: 'test-span-id',
        traceFlags: 1,
      };
    },
    setAttributes: () => mockSpan,
    addEvent: () => mockSpan,
    addLink: () => mockSpan,
    addLinks: () => mockSpan,
    setStatus: () => mockSpan,
    updateName: () => mockSpan,
    end: () => {},
    isRecording: () => false,
    recordException: () => {},
  };

  beforeEach(() => {
    setAttributeMock.mock.resetCalls();
  });

  void it('sets span attributes from object', () => {
    const data: DeepPartial<TelemetryPayload> = {
      latency: {
        total: 123,
        init: 12,
      },
    };
    setSpanAttributes(mockSpan, data);
    assert.strictEqual(setAttributeMock.mock.callCount(), 2);
    assert.deepStrictEqual(setAttributeMock.mock.calls[0].arguments, [
      'latency.total',
      123,
    ]);
    assert.deepStrictEqual(setAttributeMock.mock.calls[1].arguments, [
      'latency.init',
      12,
    ]);
  });

  void it('sets span attributes from object multiple times', () => {
    const latency = {
      total: 123,
      init: 12,
    };
    const event: TelemetryPayload['event'] = {
      state: 'SUCCEEDED',
      command: {
        path: ['command1'],
        parameters: ['foo', 'bar'],
      },
    };
    setSpanAttributes(mockSpan, { latency });
    setSpanAttributes(mockSpan, { event });
    assert.strictEqual(setAttributeMock.mock.callCount(), 5);
    assert.deepStrictEqual(setAttributeMock.mock.calls[0].arguments, [
      'latency.total',
      123,
    ]);
    assert.deepStrictEqual(setAttributeMock.mock.calls[1].arguments, [
      'latency.init',
      12,
    ]);
    assert.deepStrictEqual(setAttributeMock.mock.calls[2].arguments, [
      'event.state',
      'SUCCEEDED',
    ]);
    assert.deepStrictEqual(setAttributeMock.mock.calls[3].arguments, [
      'event.command.path',
      ['command1'],
    ]);
    assert.deepStrictEqual(setAttributeMock.mock.calls[4].arguments, [
      'event.command.parameters',
      ['foo', 'bar'],
    ]);
  });
});
