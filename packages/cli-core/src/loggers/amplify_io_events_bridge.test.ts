import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { AmplifyIOEventsBridge } from './amplify_io_events_bridge.js';
import { AmplifyIoHostEventMessage } from '@aws-amplify/plugin-types';
import { printer } from '../printer.js';
import { format } from '../format/format.js';
import { LogLevel } from '../printer/printer.js';

const testMessage: AmplifyIoHostEventMessage<string> = {
  data: 'someData',
  action: 'amplify',
  code: 'someCode',
  message: 'someMessage',
  level: 'info',
  time: new Date(),
};
void describe('amplify io events bridge', () => {
  void it('passing no handlers works', async () => {
    const bridge = new AmplifyIOEventsBridge({ notify: [] });
    await bridge.notify(testMessage);
    // No errors
  });

  void it('a single handler passed gets the message', async () => {
    const handler =
      mock.fn<<T>(msg: AmplifyIoHostEventMessage<T>) => Promise<void>>();
    const bridge = new AmplifyIOEventsBridge({ notify: [handler] });
    await bridge.notify(testMessage);
    assert.strictEqual(handler.mock.callCount(), 1);
    assert.deepStrictEqual(handler.mock.calls[0].arguments, [testMessage]);
  });

  void it('multiple handlers passed, all get the message', async () => {
    const handler1 =
      mock.fn<<T>(msg: AmplifyIoHostEventMessage<T>) => Promise<void>>();
    const handler2 =
      mock.fn<<T>(msg: AmplifyIoHostEventMessage<T>) => Promise<void>>();
    const handler3 =
      mock.fn<<T>(msg: AmplifyIoHostEventMessage<T>) => Promise<void>>();
    const bridge = new AmplifyIOEventsBridge({
      notify: [handler1, handler2, handler3],
    });
    await bridge.notify(testMessage);
    assert.strictEqual(handler1.mock.callCount(), 1);
    assert.deepStrictEqual(handler1.mock.calls[0].arguments, [testMessage]);
    assert.strictEqual(handler2.mock.callCount(), 1);
    assert.deepStrictEqual(handler2.mock.calls[0].arguments, [testMessage]);
    assert.strictEqual(handler3.mock.callCount(), 1);
    assert.deepStrictEqual(handler3.mock.calls[0].arguments, [testMessage]);
  });
  void it('does not reject if any handler rejects, rather prints a warn message', async () => {
    const notifyHandlerError = new Error('some error');
    const handler1 =
      mock.fn<<T>(msg: AmplifyIoHostEventMessage<T>) => Promise<void>>();
    const handler2 =
      mock.fn<<T>(msg: AmplifyIoHostEventMessage<T>) => Promise<void>>();
    handler2.mock.mockImplementationOnce(() =>
      Promise.reject(notifyHandlerError),
    );
    const bridge = new AmplifyIOEventsBridge({
      notify: [handler1, handler2],
    });
    const printerLogMock = mock.method(printer, 'log');

    await bridge.notify(testMessage); // Should not reject
    assert.strictEqual(handler1.mock.callCount(), 1);
    assert.deepStrictEqual(handler1.mock.calls[0].arguments, [testMessage]);
    assert.strictEqual(handler2.mock.callCount(), 1);
    assert.deepStrictEqual(handler2.mock.calls[0].arguments, [testMessage]);
    assert.strictEqual(printerLogMock.mock.callCount(), 1);
    assert.deepStrictEqual(printerLogMock.mock.calls[0].arguments, [
      `Failed to notify message '${testMessage.message}' with error ${format.error(notifyHandlerError)}`,
      LogLevel.WARN,
    ]);
  });
});
