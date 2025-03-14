import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { AmplifyIOEventsBridge } from './amplify_io_events_bridge.js';
import { AmplifyIoHostEventMessage } from '@aws-amplify/plugin-types';

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
  void it('rejects if any one handler rejects', async () => {
    const handler1 =
      mock.fn<<T>(msg: AmplifyIoHostEventMessage<T>) => Promise<void>>();
    const handler2 =
      mock.fn<<T>(msg: AmplifyIoHostEventMessage<T>) => Promise<void>>();
    handler2.mock.mockImplementationOnce(() =>
      Promise.reject(new Error('some error')),
    );
    const bridge = new AmplifyIOEventsBridge({
      notify: [handler1, handler2],
    });

    await assert.rejects(bridge.notify(testMessage), {
      message: 'some error',
    });
    assert.strictEqual(handler1.mock.callCount(), 1);
    assert.deepStrictEqual(handler1.mock.calls[0].arguments, [testMessage]);
    assert.strictEqual(handler2.mock.callCount(), 1);
    assert.deepStrictEqual(handler2.mock.calls[0].arguments, [testMessage]);
  });
});
