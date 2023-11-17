import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import { ConfigController } from './config_controller.js';

void describe('config controller', () => {
  const mockedFsReadFileSync = mock.method(fs, 'readFileSync');
  const mockedFsWriteFileSync = mock.method(fs, 'writeFileSync');
  const mockedFsExistsSync = mock.method(fs, 'existsSync');

  beforeEach(() => {
    mockedFsReadFileSync.mock.resetCalls();
    mockedFsWriteFileSync.mock.resetCalls();
    mockedFsExistsSync.mock.resetCalls();
  });

  void it('if config has not been cached, read from fs', () => {
    mockedFsReadFileSync.mock.mockImplementationOnce(function () {
      return {
        toString: function () {
          return '{}';
        },
      };
    });
    const controller = new ConfigController();
    const resolvedValue = controller.get('hello.world');
    assert.strictEqual(resolvedValue, undefined);
    assert.strictEqual(mockedFsReadFileSync.mock.callCount(), 1);
  });

  void it('should not throw & return undefined with path points to undefined nested object ', async () => {
    const controller = new ConfigController();
    controller._store = {};
    const resolvedValue = controller.get('hello.world');
    assert.strictEqual(resolvedValue, undefined);
    assert.equal(mockedFsReadFileSync.mock.callCount(), 0);
  });

  void it('should get value ', async () => {
    const controller = new ConfigController();
    controller._store = { hello: false };
    const resolvedValue = controller.get('hello');
    assert.strictEqual(resolvedValue, false);
  });

  void it('should get value by path ', async () => {
    const controller = new ConfigController();
    controller._store = { hello: { world: 'foo' } };
    const resolvedValue = controller.get('hello.world');
    assert.strictEqual(resolvedValue, 'foo');
  });

  void it('set by path should override value', async () => {
    const controller = new ConfigController();
    controller._store = { hello: { world: 'foo' } };
    controller.set('hello.world', false);
    assert.deepStrictEqual(controller._store, {
      hello: { world: false },
    });
  });

  void it('set by path should set value and not change existing values', async () => {
    const controller = new ConfigController();
    controller._store = { hello: { world: { foo: 'bar' } } };
    controller.set('hello.baz', 7);
    assert.deepStrictEqual(controller._store, {
      hello: {
        world: { foo: 'bar' },
        baz: 7,
      },
    });
  });

  void it('if config has not been cached & config file does not exist, it should init cache, config file, then write to file', () => {
    mockedFsExistsSync.mock.mockImplementationOnce(() => false);

    const controller = new ConfigController();
    controller.set('hello.world', true);

    assert.strictEqual(mockedFsExistsSync.mock.callCount(), 1);
    assert.strictEqual(mockedFsReadFileSync.mock.callCount(), 0);
    assert.strictEqual(mockedFsWriteFileSync.mock.callCount(), 2);
    assert.deepStrictEqual(controller._store, { hello: { world: true } });
    assert.deepStrictEqual(
      mockedFsWriteFileSync.mock.calls[0].arguments[1],
      '{}'
    );
    assert.deepStrictEqual(
      mockedFsWriteFileSync.mock.calls[1].arguments[1],
      JSON.stringify({ hello: { world: true } })
    );
  });

  void it('if config has not been cached & config file does not exist, it should init cache, config file, then update cached store', () => {
    mockedFsExistsSync.mock.mockImplementationOnce(() => false);

    const controller = new ConfigController();
    controller.set('hello.world', true, false);

    assert.strictEqual(mockedFsExistsSync.mock.callCount(), 1);
    assert.strictEqual(mockedFsReadFileSync.mock.callCount(), 0);
    assert.strictEqual(mockedFsWriteFileSync.mock.callCount(), 1);
    assert.deepStrictEqual(
      mockedFsWriteFileSync.mock.calls[0].arguments[1],
      '{}'
    );
    assert.deepStrictEqual(controller._store, { hello: { world: true } });
  });
});
