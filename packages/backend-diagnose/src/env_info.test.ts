import * as assert from 'node:assert';
import * as test from 'node:test';
import { formatEnvInfo, getEnvInfo } from './env_info.js';
import envinfo from 'envinfo';

void test.describe('Env Info', () => {
  const mockValue: Awaited<ReturnType<typeof getEnvInfo>> = {
    System: {
      CPU: 'fake',
      Memory: 'fake',
      OS: 'fakeOS',
      Shell: {
        path: '/fake/path',
        version: '0.0.0',
      },
    },
    Binaries: {
      Node: {
        path: '/fake/path',
        version: '0.0.0',
      },
      npm: {
        path: '/fake/path',
        version: '0.0.0',
      },
      pnpm: {
        path: '/fake/path',
        version: '0.0.0',
      },
      Yarn: {
        path: '/fake/path',
        version: '0.0.0',
      },
    },
    npmPackages: {
      fake: {
        installed: '0.0.0',
        wanted: '0.0.0',
      },
    },
  };

  const infoMock = test.mock.fn(() =>
    Promise.resolve(JSON.stringify(mockValue))
  );

  test.mock.method(envinfo, 'run', infoMock);

  void test.it('gets info', async () => {
    const result = await getEnvInfo();
    assert.deepStrictEqual(result, mockValue);
  });

  void test.it('formats info', () => {
    const expected = `
System:
  CPU: ${mockValue.System.CPU}
  Memory: ${mockValue.System.Memory}
  OS: ${mockValue.System.OS}
  Shell: ${mockValue.System.Shell.path}
Binaries:
  Node: ${mockValue.Binaries.Node.version} - ${mockValue.Binaries.Node.path}
  npm: ${mockValue.Binaries.npm.version} - ${mockValue.Binaries.npm.path}
  pnpm: ${mockValue.Binaries.pnpm.version} - ${mockValue.Binaries.pnpm.path}
  Yarn: ${mockValue.Binaries.Yarn.version} - ${mockValue.Binaries.Yarn.path}
NPM Packages:
  fake: ${(mockValue.npmPackages.fake as Record<string, string>).installed}
`.trim();

    const result = formatEnvInfo(mockValue);
    assert.strictEqual<string>(result, expected);
  });
});
