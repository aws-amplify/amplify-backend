import fsp from 'fs/promises';
import { describe, it, mock } from 'node:test';
import * as path from 'path';
import assert from 'node:assert';
import { getClientConfigPath } from './get_client_config_path.js';
import { ClientConfigFormat } from '../index.js';

const configFileName = 'amplifyconfiguration';
const testPath = 'some/path';

mock.method(fsp, 'mkdir', () => undefined);

void describe('getClientConfigPath', () => {
  void it('returns path to config file', async () => {
    const configPath = await getClientConfigPath();
    assert.equal(
      configPath,
      path.join(process.cwd(), `${configFileName}.${ClientConfigFormat.JSON}`)
    );
  });

  void it('returns path to config file with provided dir path', async () => {
    const configPath = await getClientConfigPath(testPath);
    assert.equal(
      configPath,
      path.join(
        process.cwd(),
        testPath,
        `${configFileName}.${ClientConfigFormat.JSON}`
      )
    );
  });

  void it('returns path to config file with provided dir path and format', async () => {
    const configPath = await getClientConfigPath(
      testPath,
      ClientConfigFormat.JSON
    );
    assert.equal(
      configPath,
      path.join(
        process.cwd(),
        testPath,
        `${configFileName}.${ClientConfigFormat.JSON}`
      )
    );
  });

  void it('returns path to config file with provided format, no dir path', async () => {
    const configPath = await getClientConfigPath(
      undefined,
      ClientConfigFormat.TS
    );
    assert.equal(
      configPath,
      path.join(process.cwd(), `${configFileName}.${ClientConfigFormat.TS}`)
    );
  });

  void it('create directory if path contains a "."', async () => {
    // this is a valid case to maintain consistency with behaviors of amplify generate graphql-client-code/forms
    const pathContainingDot = `${testPath}/testConfig.json`;
    const configPath = await getClientConfigPath(pathContainingDot);

    assert.equal(
      configPath,
      path.join(
        process.cwd(),
        pathContainingDot,
        `${configFileName}.${ClientConfigFormat.JSON}`
      )
    );
  });

  void it('create directory if path does not exist', async () => {
    const nonExistingPath = 'some/not/existing/path';
    const configPath = await getClientConfigPath(nonExistingPath);

    assert.equal(
      configPath,
      path.join(
        process.cwd(),
        nonExistingPath,
        `${configFileName}.${ClientConfigFormat.JSON}`
      )
    );
  });

  void it('returns path to config file with absolute path', async () => {
    const configPath = await getClientConfigPath(
      `${process.cwd()}/${testPath}`
    );
    assert.equal(
      configPath,
      path.join(
        process.cwd(),
        testPath,
        `${configFileName}.${ClientConfigFormat.JSON}`
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
      const configPath = await getClientConfigPath(undefined, entry.format);

      assert.ok(configPath.endsWith(entry.expectedFileExtension));
    });
  });
});
