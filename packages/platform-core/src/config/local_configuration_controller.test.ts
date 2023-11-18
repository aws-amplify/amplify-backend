import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import { LocalConfigurationController } from './local_configuration_controller.js';

void describe('config controller', () => {
  const mockedFsReadFile = mock.method(fs, 'readFile');
  const mockedFsWriteFile = mock.method(fs, 'writeFile');
  const mockedFsAccess = mock.method(fs, 'access');

  beforeEach(() => {
    mockedFsReadFile.mock.resetCalls();
    mockedFsWriteFile.mock.resetCalls();
    mockedFsAccess.mock.resetCalls();
  });

  void it('if config has not been cached, read from fs', async () => {
    mockedFsReadFile.mock.mockImplementationOnce(function () {
      return '{"hello": 123}';
    });
    const controller = new LocalConfigurationController();
    const resolvedValue = await controller.get('hello.world');
    assert.strictEqual(resolvedValue, undefined);
    assert.strictEqual(mockedFsReadFile.mock.callCount(), 1);
  });

  void it('should not throw & return undefined with path points to undefined nested object ', async () => {
    const controller = new LocalConfigurationController();
    controller._store = {};
    const resolvedValue = await controller.get('hello.world');
    assert.strictEqual(resolvedValue, undefined);
    assert.equal(mockedFsReadFile.mock.callCount(), 0);
  });

  void it('should get value ', async () => {
    const controller = new LocalConfigurationController();
    controller._store = { hello: false };
    const resolvedValue = await controller.get('hello');
    assert.strictEqual(resolvedValue, false);
    assert.equal(mockedFsReadFile.mock.callCount(), 0);
  });

  void it('should get value by path ', async () => {
    const controller = new LocalConfigurationController();
    controller._store = { hello: { world: 'foo' } };
    const resolvedValue = await controller.get('hello.world');
    assert.strictEqual(resolvedValue, 'foo');
    assert.equal(mockedFsReadFile.mock.callCount(), 0);
  });

  void it('set by path should override value', async () => {
    const controller = new LocalConfigurationController();
    controller._store = { hello: { world: 'foo' } };
    await controller.set('hello.world', false);
    assert.deepStrictEqual(controller._store, {
      hello: { world: false },
    });
    assert.equal(mockedFsReadFile.mock.callCount(), 0);
  });

  void it('set by path should set value and not change existing values', async () => {
    const controller = new LocalConfigurationController();
    controller._store = { hello: { world: { foo: 'bar' } } };
    await controller.set('hello.baz', 7);
    assert.deepStrictEqual(controller._store, {
      hello: {
        world: { foo: 'bar' },
        baz: 7,
      },
    });
    assert.equal(mockedFsReadFile.mock.callCount(), 0);
  });

  void it('if config has not been cached & config file does not exist, it should init cache, config file, then write to file', async () => {
    mockedFsAccess.mock.mockImplementationOnce(() => {
      throw Error('file does not exist');
    });

    const controller = new LocalConfigurationController();
    await controller.set('hello.world', true);

    assert.strictEqual(mockedFsAccess.mock.callCount(), 1);
    assert.strictEqual(mockedFsReadFile.mock.callCount(), 0);
    assert.strictEqual(mockedFsWriteFile.mock.callCount(), 2);
    assert.deepStrictEqual(controller._store, { hello: { world: true } });
    assert.deepStrictEqual(mockedFsWriteFile.mock.calls[0].arguments[1], '{}');
    assert.deepStrictEqual(
      mockedFsWriteFile.mock.calls[1].arguments[1],
      JSON.stringify({ hello: { world: true } })
    );
  });
});
