import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  AWS_CREDENTIALS_FILE_NAME,
  ProfileConfiguration,
  getAWSConfigFilePath,
  getAWSCredentialsFilePath,
} from './profile_configuration.js';
import open from 'open';
import fs from 'fs/promises';

const openMock = mock.fn(open, (url: string) => Promise.resolve(url));

type FileErrorCode = 'ENOENT' | 'EACCES';
class FileReadError extends Error {
  public code: string;
  constructor(message: string, code: FileErrorCode) {
    super(message);
    this.code = code;
  }
}

void describe('profile configuration', () => {
  const profileConfiguration = new ProfileConfiguration(openMock as never);
  beforeEach(() => {
    openMock.mock.resetCalls();
  });

  void it('opens doc url', async () => {
    await profileConfiguration.openDocs();
    assert.equal(openMock.mock.callCount(), 1);
  });

  void it('gets aws regions', () => {
    const regions = profileConfiguration.getRegions();
    assert.equal(regions.length, 18);
  });

  void it("configures local aws profile when .aws config and credentials files don't exist", async (context) => {
    const readFileMock = context.mock.method(fs, 'readFile', (path: string) => {
      throw new FileReadError(`No such file or directory at ${path}`, 'ENOENT');
    });
    const writeFileMock = context.mock.method(fs, 'writeFile', () =>
      Promise.resolve('')
    );
    await profileConfiguration.configure({
      accessKeyId: 'accessKeyId',
      secretAccessKey: 'secretAccessKey',
      region: 'us-east-1',
    });
    assert.equal(readFileMock.mock.callCount(), 2);
    assert.equal(writeFileMock.mock.callCount(), 2);
    assert.deepEqual(writeFileMock.mock.calls[0].arguments, [
      getAWSCredentialsFilePath(),
      '[default]\n' +
        'aws_access_key_id=accessKeyId\n' +
        'aws_secret_access_key=secretAccessKey\n',
      {
        mode: 384,
      },
    ]);
    assert.deepEqual(writeFileMock.mock.calls[1].arguments, [
      getAWSConfigFilePath(),
      '[default]\n' + 'region=us-east-1\n',
      {
        mode: 384,
      },
    ]);
  });

  void it("configures local aws profile when one of the .aws files don't exist", async (context) => {
    const readFileMock = context.mock.method(fs, 'readFile', (path: string) => {
      if (path.includes('credentials')) {
        throw new FileReadError(
          `No such file or directory at ${path}`,
          'ENOENT'
        );
      }
      return Promise.resolve(`
[amplify-sandbox]
region = us-west-2
output = json
`);
    });
    const writeFileMock = context.mock.method(fs, 'writeFile', () =>
      Promise.resolve('')
    );
    await profileConfiguration.configure({
      accessKeyId: 'accessKeyId',
      secretAccessKey: 'secretAccessKey',
      region: 'us-east-1',
    });
    assert.equal(readFileMock.mock.callCount(), 2);
    assert.equal(writeFileMock.mock.callCount(), 2);
    assert.deepEqual(writeFileMock.mock.calls[0].arguments, [
      getAWSCredentialsFilePath(),
      '[default]\n' +
        'aws_access_key_id=accessKeyId\n' +
        'aws_secret_access_key=secretAccessKey\n',
      {
        mode: 384,
      },
    ]);
    assert.deepEqual(writeFileMock.mock.calls[1].arguments, [
      getAWSConfigFilePath(),
      '[amplify-sandbox]\n' +
        'region=us-west-2\n' +
        'output=json\n' +
        '\n' +
        '[default]\n' +
        'region=us-east-1\n',
      {
        mode: 384,
      },
    ]);
  });

  void it('configures local aws profile when .aws config and credentials files exist', async (context) => {
    const readFileMock = context.mock.method(fs, 'readFile', (path: string) =>
      path.includes(AWS_CREDENTIALS_FILE_NAME)
        ? Promise.resolve(`
[amplify-sandbox]
aws_access_key_id=aws_access_key_id
aws_secret_access_key=aws_secret_access_key
`)
        : Promise.resolve(`
[amplify-sandbox]
region = us-west-2
output = json
`)
    );
    const writeFileMock = context.mock.method(fs, 'writeFile', () =>
      Promise.resolve('')
    );
    await profileConfiguration.configure({
      accessKeyId: 'accessKeyId',
      secretAccessKey: 'secretAccessKey',
      region: 'us-east-1',
    });
    assert.equal(readFileMock.mock.callCount(), 2);
    assert.equal(writeFileMock.mock.callCount(), 2);
    assert.deepEqual(writeFileMock.mock.calls[0].arguments, [
      getAWSCredentialsFilePath(),
      '[amplify-sandbox]\n' +
        'aws_access_key_id=aws_access_key_id\n' +
        'aws_secret_access_key=aws_secret_access_key\n' +
        '\n' +
        '[default]\n' +
        'aws_access_key_id=accessKeyId\n' +
        'aws_secret_access_key=secretAccessKey\n',
      {
        mode: 384,
      },
    ]);
    assert.deepEqual(writeFileMock.mock.calls[1].arguments, [
      getAWSConfigFilePath(),
      '[amplify-sandbox]\n' +
        'region=us-west-2\n' +
        'output=json\n' +
        '\n' +
        '[default]\n' +
        'region=us-east-1\n',
      {
        mode: 384,
      },
    ]);
  });

  void it('throws error when unable to read files due to access denied errors', async (context) => {
    const readFileMock = context.mock.method(fs, 'readFile', (path: string) => {
      throw new FileReadError(`Access denied ${path}`, 'EACCES');
    });
    const writeFileMock = context.mock.method(fs, 'writeFile', () =>
      Promise.resolve('')
    );
    try {
      await profileConfiguration.configure({
        accessKeyId: 'accessKeyId',
        secretAccessKey: 'secretAccessKey',
        region: 'us-east-1',
      });
    } catch (e) {
      assert.equal((e as FileReadError).code, 'EACCES');
    } finally {
      assert.equal(readFileMock.mock.callCount(), 1);
      assert.equal(writeFileMock.mock.callCount(), 0);
    }
  });
});
