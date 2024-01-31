import * as os from 'node:os';
import * as assert from 'node:assert';
import * as test from 'node:test';
import { EnvironmentInfoProvider } from './env_info_provider.js';
import envinfo from 'envinfo';

void test.describe('Env Info', () => {
  const mockValue = {
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
    const expectedLines = [
      'System:',
      `  CPU: ${mockValue.System.CPU}`,
      `  Memory: ${mockValue.System.Memory}`,
      `  OS: ${mockValue.System.OS}`,
      `  Shell: ${mockValue.System.Shell.path}`,
      'Binaries:',
      `  Node: ${mockValue.Binaries.Node.version} - ${mockValue.Binaries.Node.path}`,
      `  npm: ${mockValue.Binaries.npm.version} - ${mockValue.Binaries.npm.path}`,
      `  pnpm: ${mockValue.Binaries.pnpm.version} - ${mockValue.Binaries.pnpm.path}`,
      `  Yarn: ${mockValue.Binaries.Yarn.version} - ${mockValue.Binaries.Yarn.path}`,
      'NPM Packages:',
      `  fake: ${
        (mockValue.npmPackages.fake as Record<string, string>).installed
      }`,
    ];

    const expected = expectedLines.join(os.EOL);
    const environmentInfoProvider = new EnvironmentInfoProvider();
    const result = await environmentInfoProvider.getEnvInfo();
    assert.strictEqual<string>(result, expected);
  });
});
