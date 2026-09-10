import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { PassThrough } from 'node:stream';
import type { ReadStream } from 'node:tty';
import { AmplifyPrompter, printer } from '@aws-amplify/cli-core';
import {
  HostingValueGetCommand,
  HostingValueListCommand,
  HostingValueRemoveCommand,
  HostingValueSetCommand,
} from './hosting_value_commands.js';
import type { HostingValueStore } from './hosting_value_store.js';

/**
 * Command-layer tests for `ampx secret` / `ampx config`. These cover the
 * security-sensitive surface: key validation, secret input via stdin, and the
 * get/list/remove UX (incl. the destructive-delete confirmation). The backing
 * store is faked; store internals are covered in hosting_value_store.test.ts.
 */
const fakeStore = () => {
  const calls = { set: [] as Array<[string, string]>, removed: [] as string[] };
  let getValue: string | undefined = 'resolved-value';
  let listKeys: string[] = ['A', 'B'];
  const store = {
    locator: (k: string) => `amplify/hosting/app/secrets/${k}`,
    setValue: async (k: string, v: string) => {
      calls.set.push([k, v]);
    },
    getValue: async () => getValue,
    listKeys: async () => listKeys,
    removeKey: async (k: string) => {
      calls.removed.push(k);
    },
  } as unknown as HostingValueStore;
  return {
    store,
    calls,
    setGet: (v: string | undefined) => (getValue = v),
    setList: (v: string[]) => (listKeys = v),
  };
};

/** A non-TTY stdin that yields `data` then ends (drives readSensitiveValue). */
const stdinWith = (data: string): ReadStream => {
  const s = new PassThrough() as unknown as ReadStream;
  (s as unknown as { isTTY: boolean }).isTTY = false;
  setTimeout(() => {
    (s as unknown as PassThrough).write(data);
    (s as unknown as PassThrough).end();
  }, 0);
  return s;
};

void describe('hosting value commands', () => {
  let printed: string[];
  beforeEach(() => {
    printed = [];
    mock.method(printer, 'print', (m: string) => {
      printed.push(m);
    });
  });
  afterEach(() => mock.restoreAll());

  void describe('set', () => {
    void it('config: writes the inline value', async () => {
      const { store, calls } = fakeStore();
      const cmd = new HostingValueSetCommand('config', store);
      await cmd.handler({ key: 'DOMAIN', value: 'example.com' } as never);
      assert.deepStrictEqual(calls.set, [['DOMAIN', 'example.com']]);
      assert.ok(printed[0].includes("Successfully set config 'DOMAIN'"));
    });

    void it('config: prompts when no inline value', async () => {
      const { store, calls } = fakeStore();
      mock.method(AmplifyPrompter, 'input', async () => 'prompted');
      const cmd = new HostingValueSetCommand('config', store);
      await cmd.handler({ key: 'DOMAIN' } as never);
      assert.deepStrictEqual(calls.set, [['DOMAIN', 'prompted']]);
    });

    void it('secret: reads the value from piped stdin (never argv)', async () => {
      const { store, calls } = fakeStore();
      const cmd = new HostingValueSetCommand(
        'secret',
        store,
        stdinWith('sk_piped\n'),
      );
      // Even if a value is (mistakenly) on argv, secrets ignore it and read stdin.
      await cmd.handler({ key: 'API_KEY', value: 'ignored' } as never);
      assert.deepStrictEqual(calls.set, [['API_KEY', 'sk_piped']]);
    });

    void it('secret: reads a hidden prompt on a TTY', async () => {
      const { store, calls } = fakeStore();
      const tty = new PassThrough() as unknown as ReadStream;
      (tty as unknown as { isTTY: boolean }).isTTY = true;
      mock.method(AmplifyPrompter, 'secretValue', async () => 'sk_prompted');
      const cmd = new HostingValueSetCommand('secret', store, tty);
      await cmd.handler({ key: 'API_KEY' } as never);
      assert.deepStrictEqual(calls.set, [['API_KEY', 'sk_prompted']]);
    });
  });

  void describe('get', () => {
    void it('prints the resolved value', async () => {
      const { store } = fakeStore();
      await new HostingValueGetCommand('secret', store).handler({
        key: 'API_KEY',
      } as never);
      assert.deepStrictEqual(printed, ['resolved-value']);
    });

    void it('throws when the value is not set', async () => {
      const f = fakeStore();
      f.setGet(undefined);
      await assert.rejects(
        () =>
          new HostingValueGetCommand('secret', f.store).handler({
            key: 'X',
          } as never),
        /No secret named 'X' is set/,
      );
    });

    void it('rejects an invalid key', async () => {
      const { store } = fakeStore();
      await assert.rejects(
        () =>
          new HostingValueGetCommand('secret', store).handler({
            key: 'bad key!',
          } as never),
        /Invalid key/,
      );
    });
  });

  void describe('list', () => {
    void it('prints each key', async () => {
      const { store } = fakeStore();
      await new HostingValueListCommand('secret', store).handler();
      assert.deepStrictEqual(printed, ['A', 'B']);
    });

    void it('prints (none) when empty', async () => {
      const f = fakeStore();
      f.setList([]);
      await new HostingValueListCommand('config', f.store).handler();
      assert.deepStrictEqual(printed, ['(none)']);
    });
  });

  void describe('remove', () => {
    void it('deletes after a confirmed prompt', async () => {
      const { store, calls } = fakeStore();
      mock.method(AmplifyPrompter, 'yesOrNo', async () => true);
      await new HostingValueRemoveCommand('secret', store).handler({
        key: 'API_KEY',
      } as never);
      assert.deepStrictEqual(calls.removed, ['API_KEY']);
    });

    void it('aborts (no delete) when the prompt is declined', async () => {
      const { store, calls } = fakeStore();
      mock.method(AmplifyPrompter, 'yesOrNo', async () => false);
      await new HostingValueRemoveCommand('secret', store).handler({
        key: 'API_KEY',
      } as never);
      assert.deepStrictEqual(calls.removed, []);
      assert.ok(printed.includes('Aborted.'));
    });

    void it('skips the prompt with --force', async () => {
      const { store, calls } = fakeStore();
      const yesOrNo = mock.method(AmplifyPrompter, 'yesOrNo', async () => true);
      await new HostingValueRemoveCommand('config', store).handler({
        key: 'DOMAIN',
        force: true,
      } as never);
      assert.deepStrictEqual(calls.removed, ['DOMAIN']);
      assert.strictEqual(yesOrNo.mock.callCount(), 0);
    });

    void it('rejects an invalid key', async () => {
      const { store } = fakeStore();
      await assert.rejects(
        () =>
          new HostingValueRemoveCommand('secret', store).handler({
            key: 'bad/key',
          } as never),
        /Invalid key/,
      );
    });
  });
});
