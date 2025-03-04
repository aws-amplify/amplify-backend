import { describe, it, mock } from 'node:test';
import { v4, validate } from 'uuid';
import fs from 'fs';
import assert from 'node:assert';
import { getLocalProjectId } from './get_local_project_id';
import { ConfigurationController, configControllerFactory } from '../config/local_configuration_controller_factory';

void describe('getLocalProjectId', () => {
  const configControllerGet = mock.fn((value?: string) => value);
  const configControllerSet = mock.fn();
  const mockedConfigController: ConfigurationController = {
    get: configControllerGet,
    set: configControllerSet,
  } as unknown as ConfigurationController;
  mock.method(configControllerFactory, 'getInstance', () => mockedConfigController);
  mock.method(fs, 'existsSync', () => true);
  mock.method(fs, 'readFile', () =>
    Promise.resolve(JSON.stringify({ name: 'testAppName' }))
  );

  void it('returns a valid project UUID', async () => {
    configControllerGet.mock.mockImplementationOnce(() => undefined);
    const localProjectId = await getLocalProjectId();
    assert.ok(
      validate(localProjectId),
      `${localProjectId} is not a valid UUID string`
    );
  });

  void it('returns the cached project ID', async () => {
    const cachedProjectId = v4();
    configControllerGet.mock.mockImplementationOnce(() => cachedProjectId);
    const localProjectId = await getLocalProjectId();
    assert.deepStrictEqual(localProjectId, cachedProjectId);
  });

  void it('returns a different UUID for a different namespace', async () => {
    configControllerGet.mock.mockImplementationOnce(() => undefined);
    const installationUuid = await getLocalProjectId();
    assert.notDeepStrictEqual(installationUuid, await getLocalProjectId(v4()));
  });
});
