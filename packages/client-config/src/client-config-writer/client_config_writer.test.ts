import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  ClientConfigPathResolver,
  ClientConfigWriter,
} from './client_config_writer.js';
import {
  ClientConfig,
  ClientConfigFormat,
} from '../client-config-types/client_config.js';
import { ClientConfigFormatter } from './client_config_formatter.js';
import { randomUUID } from 'crypto';

void describe('client config writer', () => {
  const pathResolverMock = mock.fn<ClientConfigPathResolver>();
  const clientFormatter = new ClientConfigFormatter(undefined as never);
  const fspMock = {
    writeFile: mock.fn<(path: string, content: string) => Promise<void>>(() =>
      Promise.resolve()
    ),
  };
  const clientConfigWriter: ClientConfigWriter = new ClientConfigWriter(
    pathResolverMock,
    clientFormatter,
    fspMock as never
  );

  beforeEach(() => {
    fspMock.writeFile.mock.resetCalls();
    pathResolverMock.mock.resetCalls();
  });

  const clientConfig: ClientConfig = {
    aws_user_pools_id: 'something',
  };

  void it('formats and writes config', async () => {
    const outDir = '/foo/bar';
    const targetFile = '/foo/bar/baz';
    const format = ClientConfigFormat.MJS;
    const formattedContent = randomUUID().toString();

    pathResolverMock.mock.mockImplementation(() => targetFile);
    const formatMock = mock.method(
      clientFormatter,
      'format',
      () => formattedContent
    );

    await clientConfigWriter.writeClientConfig(clientConfig, outDir, format);

    assert.strictEqual(pathResolverMock.mock.callCount(), 1);
    assert.strictEqual(pathResolverMock.mock.calls[0].arguments[0], outDir);
    assert.strictEqual(pathResolverMock.mock.calls[0].arguments[1], format);

    assert.strictEqual(formatMock.mock.callCount(), 1);
    assert.strictEqual(formatMock.mock.calls[0].arguments[0], clientConfig);
    assert.strictEqual(formatMock.mock.calls[0].arguments[1], format);

    assert.strictEqual(fspMock.writeFile.mock.callCount(), 1);
    assert.strictEqual(
      fspMock.writeFile.mock.calls[0].arguments[0],
      targetFile
    );
    assert.strictEqual(
      fspMock.writeFile.mock.calls[0].arguments[1],
      formattedContent
    );
  });

  void it('formats as json by default', async () => {
    const outDir = '/foo/bar';
    const targetFile = '/foo/bar/baz';
    const formattedContent = randomUUID().toString();

    pathResolverMock.mock.mockImplementation(() => targetFile);
    const formatMock = mock.method(
      clientFormatter,
      'format',
      () => formattedContent
    );

    await clientConfigWriter.writeClientConfig(clientConfig, outDir);

    assert.strictEqual(pathResolverMock.mock.callCount(), 1);
    assert.strictEqual(
      pathResolverMock.mock.calls[0].arguments[1],
      ClientConfigFormat.JSON
    );

    assert.strictEqual(formatMock.mock.callCount(), 1);
    assert.strictEqual(
      formatMock.mock.calls[0].arguments[1],
      ClientConfigFormat.JSON
    );
  });
});
