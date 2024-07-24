import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { AmplifySandboxExecutor } from './sandbox_executor.js';
import {
  BackendDeployerFactory,
  BackendDeployerOutputFormatter,
} from '@aws-amplify/backend-deployer';
import {
  LogLevel,
  PackageManagerControllerFactory,
  Printer,
} from '@aws-amplify/cli-core';
import {
  SecretError,
  SecretListItem,
  getSecretClient,
} from '@aws-amplify/backend-secret';
import { AmplifyFault, AmplifyUserError } from '@aws-amplify/platform-core';
import { SSMServiceException } from '@aws-sdk/client-ssm';

const logMock = mock.fn();
const mockedPrinter = {
  log: mock.fn(),
};
const packageManagerControllerFactory = new PackageManagerControllerFactory(
  process.cwd(),
  new Printer(LogLevel.DEBUG)
);

const formatterStub: BackendDeployerOutputFormatter = {
  normalizeAmpxCommand: () => 'test command',
};

const backendDeployerFactory = new BackendDeployerFactory(
  packageManagerControllerFactory.getPackageManagerController(),
  formatterStub
);
const backendDeployer = backendDeployerFactory.getInstance();
const secretClient = getSecretClient();
const sandboxExecutor = new AmplifySandboxExecutor(
  backendDeployer,
  secretClient,
  mockedPrinter as never
);

const newlyUpdatedSecretItem: SecretListItem = {
  name: 'C',
  lastUpdated: new Date(1234567),
};

const listSecretMock = mock.method(secretClient, 'listSecrets', () =>
  Promise.resolve([
    {
      name: 'A',
      lastUpdated: new Date(1234),
    },
    {
      name: 'B',
    },
    newlyUpdatedSecretItem,
  ])
);

const backendDeployerDeployMock = mock.method(backendDeployer, 'deploy', () =>
  Promise.resolve()
);

const validateAppSourcesProvider = mock.fn(() => true);

void describe('Sandbox executor', () => {
  afterEach(() => {
    backendDeployerDeployMock.mock.resetCalls();
    validateAppSourcesProvider.mock.resetCalls();
    listSecretMock.mock.resetCalls();
    logMock.mock.resetCalls();
  });

  void it('retrieves file change summary once (debounce)', async () => {
    const firstDeployPromise = sandboxExecutor.deploy(
      {
        namespace: 'testSandboxId',
        name: 'testSandboxName',
        type: 'sandbox',
      },
      validateAppSourcesProvider
    );

    const secondDeployPromise = sandboxExecutor.deploy(
      {
        namespace: 'testSandboxId',
        name: 'testSandboxName',
        type: 'sandbox',
      },
      validateAppSourcesProvider
    );

    await Promise.all([firstDeployPromise, secondDeployPromise]);

    // Assert debounce worked as expected
    assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
    assert.strictEqual(validateAppSourcesProvider.mock.callCount(), 1);
  });

  void it('throws AmplifyUserError if listSecrets fails due to ExpiredTokenException', async () => {
    const ssmError = new SSMServiceException({
      name: 'ExpiredTokenException',
      $fault: 'client',
      $metadata: {},
    });
    const secretsError = SecretError.createInstance(ssmError);
    listSecretMock.mock.mockImplementationOnce(() => {
      throw secretsError;
    });
    await assert.rejects(
      () =>
        sandboxExecutor.deploy(
          {
            namespace: 'testSandboxId',
            name: 'testSandboxName',
            type: 'sandbox',
          },
          validateAppSourcesProvider
        ),
      new AmplifyUserError(
        'SecretsExpiredTokenError',
        {
          message: 'Fetching the list of secrets failed due to expired tokens',
          resolution: 'Please refresh your credentials and try again',
        },
        secretsError
      )
    );
  });

  void it('throws AmplifyUserError if listSecrets fails due to CredentialsProviderError', async () => {
    const credentialsError = new Error('credentials error');
    credentialsError.name = 'CredentialsProviderError';
    const secretsError = SecretError.createInstance(credentialsError);
    listSecretMock.mock.mockImplementationOnce(() => {
      throw secretsError;
    });
    await assert.rejects(
      () =>
        sandboxExecutor.deploy(
          {
            namespace: 'testSandboxId',
            name: 'testSandboxName',
            type: 'sandbox',
          },
          validateAppSourcesProvider
        ),
      new AmplifyUserError(
        'SecretsExpiredTokenError',
        {
          message: 'Fetching the list of secrets failed due to expired tokens',
          resolution: 'Please refresh your credentials and try again',
        },
        secretsError
      )
    );
  });

  void it('throws AmplifyFault if listSecrets fails due to a non-SSM exception other than expired credentials', async () => {
    const underlyingError = new Error('some secret error');
    const secretError = SecretError.createInstance(underlyingError);
    listSecretMock.mock.mockImplementationOnce(() => {
      throw secretError;
    });
    await assert.rejects(
      () =>
        sandboxExecutor.deploy(
          {
            namespace: 'testSandboxId',
            name: 'testSandboxName',
            type: 'sandbox',
          },
          validateAppSourcesProvider
        ),
      new AmplifyFault(
        'ListSecretsFailedFault',
        {
          message: 'Fetching the list of secrets failed',
        },
        underlyingError // If it's not an SSM exception, we use the original error instead of secrets error
      )
    );
  });

  void it('throws AmplifyFault if listSecrets fails due to an SSM exception other than expired credentials', async () => {
    const underlyingError = new SSMServiceException({
      name: 'SomeException',
      $fault: 'client',
      $metadata: {},
    });
    const secretError = SecretError.createInstance(underlyingError);
    listSecretMock.mock.mockImplementationOnce(() => {
      throw secretError;
    });
    await assert.rejects(
      () =>
        sandboxExecutor.deploy(
          {
            namespace: 'testSandboxId',
            name: 'testSandboxName',
            type: 'sandbox',
          },
          validateAppSourcesProvider
        ),
      new AmplifyFault(
        'ListSecretsFailedFault',
        {
          message: 'Fetching the list of secrets failed',
        },
        secretError // If it's an SSM exception, we use the wrapper secret error
      )
    );
  });

  [true, false].forEach((shouldValidateSources) => {
    void it(`calls deployer with correct validateSources=${shouldValidateSources.toString()} setting`, async () => {
      validateAppSourcesProvider.mock.mockImplementationOnce(
        () => shouldValidateSources
      );

      await sandboxExecutor.deploy(
        {
          namespace: 'testSandboxId',
          name: 'testSandboxName',
          type: 'sandbox',
        },
        validateAppSourcesProvider
      );

      assert.strictEqual(backendDeployerDeployMock.mock.callCount(), 1);
      // BackendDeployer should be called with the right params
      assert.deepStrictEqual(
        backendDeployerDeployMock.mock.calls[0].arguments,
        [
          {
            name: 'testSandboxName',
            namespace: 'testSandboxId',
            type: 'sandbox',
          },
          {
            secretLastUpdated: newlyUpdatedSecretItem.lastUpdated,
            validateAppSources: shouldValidateSources,
          },
        ]
      );
    });
  });
});
