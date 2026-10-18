import { describe, it } from 'node:test';
import assert from 'node:assert';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

type RunResult = { killed: boolean; code: number | null; calls: number };

/**
 * Runs the compiled shim in a separate node process so we can observe whether it keeps the process alive.
 * `setup` runs before the shim and must define the resolver that the banner normally provides.
 * `after` runs after the shim, standing in for handler work.
 */
const runShim = async (
  setup: string,
  after = '',
  refreshMs?: number,
): Promise<RunResult> => {
  let shimCode = await readFile(
    fileURLToPath(new URL('./invoke_ssm_shim.js', import.meta.url)),
    'utf-8',
  );
  if (refreshMs !== undefined) {
    const refreshDeclaration = 'const SSM_PARAMETER_REFRESH_MS = 1000 * 60;';
    assert.ok(
      shimCode.includes(refreshDeclaration),
      'could not find the refresh interval declaration in the shim',
    );
    shimCode = shimCode.replace(
      refreshDeclaration,
      `const SSM_PARAMETER_REFRESH_MS = ${refreshMs};`,
    );
  }
  const script = `${setup}\n${shimCode}\n${after}`;

  return new Promise((resolve) => {
    const child = execFile(
      process.execPath,
      ['--input-type=module', '--eval', script],
      { timeout: 10_000 },
      (_error, stdout) =>
        resolve({
          killed: child.killed,
          code: child.exitCode,
          calls: Number(/calls=(\d+)/.exec(stdout)?.[1] ?? NaN),
        }),
    );
  });
};

const countCallsSetup = `
let calls = 0;
globalThis.internalAmplifyFunctionResolveSsmParams = async () => { calls++; };
process.on('exit', () => console.log('calls=' + calls));
`;

void describe('invoke_ssm_shim', () => {
  void it('does not keep the process alive after the handler work is done', async () => {
    const result = await runShim(
      'globalThis.internalAmplifyFunctionResolveSsmParams = async () => {};',
    );

    assert.strictEqual(
      result.killed,
      false,
      'process was still running after 10s, the SSM refresh interval is holding the event loop open',
    );
    assert.strictEqual(result.code, 0);
  });

  void it('still refreshes params while other work keeps the process alive', async () => {
    const result = await runShim(
      countCallsSetup,
      'setTimeout(() => {}, 500);',
      50,
    );

    assert.strictEqual(result.killed, false);
    assert.strictEqual(result.code, 0);
    // one call at startup plus several refreshes during the 500ms of work
    assert.ok(
      result.calls >= 4,
      `expected at least 4 resolver calls but got ${result.calls}`,
    );
  });

  void it('stops refreshing once the process has no other work', async () => {
    const result = await runShim(countCallsSetup, '', 50);

    assert.strictEqual(result.killed, false);
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.calls, 1);
  });

  void it('keeps running and still exits when a refresh fails', async () => {
    const result = await runShim(
      `
let calls = 0;
globalThis.internalAmplifyFunctionResolveSsmParams = async () => {
  calls++;
  if (calls > 1) throw new Error('refresh failed');
};
process.on('exit', () => console.log('calls=' + calls));
`,
      'setTimeout(() => {}, 300);',
      50,
    );

    assert.strictEqual(result.killed, false);
    assert.strictEqual(result.code, 0);
    assert.ok(
      result.calls >= 3,
      `expected refreshes to continue after a failure but got ${result.calls} calls`,
    );
  });
});
