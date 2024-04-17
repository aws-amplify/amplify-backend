import fsp from 'fs/promises';
import os from 'os';
import { beforeEach, describe, it, mock } from 'node:test';
import { generateEmptyClientConfigToFile } from './generate_empty_client_config_to_file.js';
import {
  ClientConfigFormat,
  ClientConfigVersionOption,
} from './index.internal.js';
import assert from 'assert';
import path from 'path';

void describe('generate empty client config to file', () => {
  const writeFileMock = mock.method(fsp, 'writeFile', () => true);
  void beforeEach(() => {
    writeFileMock.mock.resetCalls();
  });
  void it('correctly generates an empty file for legacy config', async () => {
    await generateEmptyClientConfigToFile(
      ClientConfigVersionOption.V0,
      'userOutDir',
      ClientConfigFormat.TS
    );
    assert.equal(writeFileMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      writeFileMock.mock.calls[0].arguments[1],
      `const amplifyConfig = {}${os.EOL}export default amplifyConfig;${os.EOL}`
    );
    assert.deepStrictEqual(
      writeFileMock.mock.calls[0].arguments[0],
      path.join(process.cwd(), 'userOutDir', 'amplifyconfiguration.ts')
    );
  });
  void it('correctly generates an empty file for client config version 1', async () => {
    await generateEmptyClientConfigToFile(
      ClientConfigVersionOption.V1,
      'userOutDir'
    );
    assert.equal(writeFileMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      writeFileMock.mock.calls[0].arguments[1],
      `{\n  "version": "1"\n}`
    );
    assert.deepStrictEqual(
      writeFileMock.mock.calls[0].arguments[0],
      path.join(process.cwd(), 'userOutDir', 'amplify_outputs.json')
    );
  });
});
