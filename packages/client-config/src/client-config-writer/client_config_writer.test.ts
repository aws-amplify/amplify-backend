import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  ClientConfigNameResolver,
  ClientConfigPathResolver,
  ClientConfigWriter,
} from './client_config_writer.js';
import {
  ClientConfig,
  ClientConfigFileBaseName,
  ClientConfigFormat,
  ClientConfigVersionOption,
  DEFAULT_CLIENT_CONFIG_VERSION,
} from '../client-config-types/client_config.js';
import { ClientConfigFormatterLegacy } from './client_config_formatter_legacy.js';
import { randomUUID } from 'crypto';

void describe('client config writer', () => {
  const sampleRegion = 'test_region';
  const sampleIdentityPoolId = 'test_identity_pool_id';
  const sampleUserPoolClientId = 'test_user_pool_client_id';

  const pathResolverMock = mock.fn<ClientConfigPathResolver>();
  const nameResolverMock = mock.fn<ClientConfigNameResolver>();
  const clientFormatter = new ClientConfigFormatterLegacy(undefined as never);
  const fspMock = {
    writeFile: mock.fn<(path: string, content: string) => Promise<void>>(() =>
      Promise.resolve()
    ),
  };
  const clientConfigWriter: ClientConfigWriter = new ClientConfigWriter(
    pathResolverMock,
    nameResolverMock,
    clientFormatter,
    fspMock as never
  );

  beforeEach(() => {
    fspMock.writeFile.mock.resetCalls();
    pathResolverMock.mock.resetCalls();
    nameResolverMock.mock.resetCalls();
  });

  const clientConfig: ClientConfig = {
    version: '1',
    auth: {
      aws_region: sampleRegion,
      identity_pool_id: sampleIdentityPoolId,
      user_pool_client_id: sampleUserPoolClientId,
      user_pool_id: 'something',
    },
  };
  void it('formats and writes legacy config', async () => {
    const outDir = '/foo/bar';
    const targetFile = '/foo/bar/baz';
    const format = ClientConfigFormat.MJS;
    const formattedContent = randomUUID().toString();

    pathResolverMock.mock.mockImplementation(() => targetFile);
    nameResolverMock.mock.mockImplementation(
      () => ClientConfigFileBaseName.LEGACY
    );
    const formatMock = mock.method(
      clientFormatter,
      'format',
      () => formattedContent
    );

    await clientConfigWriter.writeClientConfig(
      clientConfig,
      ClientConfigVersionOption.V0,
      outDir,
      format
    );

    assert.strictEqual(pathResolverMock.mock.callCount(), 1);
    assert.strictEqual(
      pathResolverMock.mock.calls[0].arguments[0],
      ClientConfigFileBaseName.LEGACY
    );
    assert.strictEqual(pathResolverMock.mock.calls[0].arguments[1], outDir);
    assert.strictEqual(pathResolverMock.mock.calls[0].arguments[2], format);

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

  void it('formats and writes default config', async () => {
    const outDir = '/foo/bar';
    const targetFile = '/foo/bar/baz';
    const format = ClientConfigFormat.MJS;
    const formattedContent = randomUUID().toString();

    pathResolverMock.mock.mockImplementation(() => targetFile);
    nameResolverMock.mock.mockImplementation(
      () => ClientConfigFileBaseName.DEFAULT
    );
    const formatMock = mock.method(
      clientFormatter,
      'format',
      () => formattedContent
    );

    await clientConfigWriter.writeClientConfig(
      clientConfig,
      DEFAULT_CLIENT_CONFIG_VERSION,
      outDir,
      format
    );

    assert.strictEqual(pathResolverMock.mock.callCount(), 1);
    assert.strictEqual(
      pathResolverMock.mock.calls[0].arguments[0],
      ClientConfigFileBaseName.DEFAULT
    );
    assert.strictEqual(pathResolverMock.mock.calls[0].arguments[1], outDir);
    assert.strictEqual(pathResolverMock.mock.calls[0].arguments[2], format);

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
    nameResolverMock.mock.mockImplementation(
      () => ClientConfigFileBaseName.DEFAULT
    );

    const formatMock = mock.method(
      clientFormatter,
      'format',
      () => formattedContent
    );

    await clientConfigWriter.writeClientConfig(
      clientConfig,
      DEFAULT_CLIENT_CONFIG_VERSION,
      outDir
    );

    assert.strictEqual(pathResolverMock.mock.callCount(), 1);
    assert.strictEqual(
      pathResolverMock.mock.calls[0].arguments[0],
      ClientConfigFileBaseName.DEFAULT
    );
    assert.strictEqual(
      pathResolverMock.mock.calls[0].arguments[2],
      ClientConfigFormat.JSON
    );

    assert.strictEqual(formatMock.mock.callCount(), 1);
    assert.strictEqual(
      formatMock.mock.calls[0].arguments[1],
      ClientConfigFormat.JSON
    );
  });
});
