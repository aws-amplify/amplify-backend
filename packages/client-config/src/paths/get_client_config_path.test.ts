import fsp from 'fs/promises';
import { describe, it, mock } from 'node:test';
import * as path from 'path';
import assert from 'node:assert';
import { getClientConfigPath } from './get_client_config_path.js';
import { ClientConfigFileBaseName, ClientConfigFormat } from '../index.js';

const testPath = 'some/path';

mock.method(fsp, 'mkdir', () => undefined);

void describe('getClientConfigPath', () => {
  void it('returns path to legacy config file', async () => {
    const configPath = await getClientConfigPath(
      ClientConfigFileBaseName.LEGACY
    );
    assert.equal(
      configPath,
      path.join(
        process.cwd(),
        `${ClientConfigFileBaseName.LEGACY}.${ClientConfigFormat.JSON}`
      )
    );
  });

  void it('returns path to client config file with provided dir path', async () => {
    const configPath = await getClientConfigPath(
      ClientConfigFileBaseName.DEFAULT,
      testPath
    );
    assert.equal(
      configPath,
      path.join(
        process.cwd(),
        testPath,
        `${ClientConfigFileBaseName.DEFAULT}.${ClientConfigFormat.JSON}`
      )
    );
  });

  void it('returns path to client config file with provided dir path and format', async () => {
    const configPath = await getClientConfigPath(
      ClientConfigFileBaseName.DEFAULT,
      testPath,
      ClientConfigFormat.JSON
    );
    assert.equal(
      configPath,
      path.join(
        process.cwd(),
        testPath,
        `${ClientConfigFileBaseName.DEFAULT}.${ClientConfigFormat.JSON}`
      )
    );
  });

  void it('returns path to client config file with provided format, no dir path', async () => {
    const configPath = await getClientConfigPath(
      ClientConfigFileBaseName.DEFAULT,
      undefined,
      ClientConfigFormat.TS
    );
    assert.equal(
      configPath,
      path.join(
        process.cwd(),
        `${ClientConfigFileBaseName.DEFAULT}.${ClientConfigFormat.TS}`
      )
    );
  });

  void it('create directory if path contains a "."', async () => {
    // this is a valid case to maintain consistency with behaviors of backend generate graphql-client-code/forms
    const pathContainingDot = `${testPath}/testConfig.json`;
    const configPath = await getClientConfigPath(
      ClientConfigFileBaseName.DEFAULT,
      pathContainingDot
    );

    assert.equal(
      configPath,
      path.join(
        process.cwd(),
        pathContainingDot,
        `${ClientConfigFileBaseName.DEFAULT}.${ClientConfigFormat.JSON}`
      )
    );
  });

  void it('create directory if path does not exist', async () => {
    const nonExistingPath = 'some/not/existing/path';
    const configPath = await getClientConfigPath(
      ClientConfigFileBaseName.DEFAULT,
      nonExistingPath
    );

    assert.equal(
      configPath,
      path.join(
        process.cwd(),
        nonExistingPath,
        `${ClientConfigFileBaseName.DEFAULT}.${ClientConfigFormat.JSON}`
      )
    );
  });

  void it('returns path to client config file with absolute path', async () => {
    const configPath = await getClientConfigPath(
      ClientConfigFileBaseName.DEFAULT,
      `${process.cwd()}/${testPath}`
    );
    assert.equal(
      configPath,
      path.join(
        process.cwd(),
        testPath,
        `${ClientConfigFileBaseName.DEFAULT}.${ClientConfigFormat.JSON}`
      )
    );
  });

  const expectedFileExtensions = [
    {
      format: ClientConfigFormat.MJS,
      expectedFileExtension: '.mjs',
    },
    {
      format: ClientConfigFormat.TS,
      expectedFileExtension: '.ts',
    },
    {
      format: ClientConfigFormat.DART,
      expectedFileExtension: '.dart',
    },
    {
      format: ClientConfigFormat.JSON,
      expectedFileExtension: '.json',
    },
    {
      format: ClientConfigFormat.JSON_MOBILE,
      expectedFileExtension: '.json',
    },
  ] as const;
  expectedFileExtensions.forEach((entry) => {
    void it(`path for ${entry.format} should have ${entry.expectedFileExtension} suffix`, async () => {
      const configPath = await getClientConfigPath(
        ClientConfigFileBaseName.DEFAULT,
        undefined,
        entry.format
      );

      assert.ok(configPath.endsWith(entry.expectedFileExtension));
    });
  });
});
