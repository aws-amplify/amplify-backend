import { AttributeValue, Span, SpanContext } from '@opentelemetry/api';
import { beforeEach, describe, it, mock } from 'node:test';
import { setSpanAttributesFromObject } from './set_span_attributes_from_object';
import assert from 'node:assert';

void describe('setSpanAttributesFromObject', () => {
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
    const latency = {
      total: 123,
      init: 12,
    };
    setSpanAttributesFromObject(mockSpan, 'latency', latency);
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
    const event = {
      test: 'test value',
      nestedObject: {
        testParam: ['testParam'],
        fooBar: ['foo', 'bar'],
      },
    };
    setSpanAttributesFromObject(mockSpan, 'latency', latency);
    setSpanAttributesFromObject(mockSpan, 'event', event);
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
      'event.test',
      'test value',
    ]);
    assert.deepStrictEqual(setAttributeMock.mock.calls[3].arguments, [
      'event.nestedObject.testParam',
      ['testParam'],
    ]);
    assert.deepStrictEqual(setAttributeMock.mock.calls[4].arguments, [
      'event.nestedObject.fooBar',
      ['foo', 'bar'],
    ]);
  });
});
