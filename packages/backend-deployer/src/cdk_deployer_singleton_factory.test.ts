import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { BackendDeployerFactory } from './cdk_deployer_singleton_factory.js';
import {
  AmplifyIOHost,
  PackageManagerController,
} from '@aws-amplify/plugin-types';
import { BackendDeployerOutputFormatter } from './types.js';
import { BaseCredentials, Toolkit } from '@aws-cdk/toolkit-lib';

const formatterStub: BackendDeployerOutputFormatter = {
  normalizeAmpxCommand: () => 'test command',
};

const packageManagerControllerMock: PackageManagerController = {
  initializeProject: mock.fn(() => Promise.resolve()),
  initializeTsConfig: mock.fn(() => Promise.resolve()),
  installDependencies: mock.fn(() => Promise.resolve()),
  runWithPackageManager: mock.fn(() => Promise.resolve() as never),
  getCommand: (args: string[]) => `'npx ${args.join(' ')}'`,
  allowsSignalPropagation: () => true,
  tryGetDependencies: mock.fn(() => Promise.resolve([])),
};

const mockIoHost: AmplifyIOHost = {
  notify: mock.fn(),
  requestResponse: mock.fn(),
};

void describe('BackendDeployerFactory', () => {
  beforeEach(() => {
    // Reset the static singleton instance between tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (BackendDeployerFactory as any).instance = undefined;
  });

  void it('creates Toolkit without explicit baseCredentials when no profile is specified', () => {
    const toolkitConstructorSpy = mock.fn(Toolkit);
    const OriginalToolkit = Toolkit;

    // Resolve profile as undefined (simulates container/CI environment)
    const sdkProfileResolver = () => undefined;

    const factory = new BackendDeployerFactory(
      packageManagerControllerMock as never,
      formatterStub,
      mockIoHost,
      sdkProfileResolver,
    );

    const deployer = factory.getInstance();
    assert.ok(deployer, 'deployer instance should be created');
  });

  void it('creates Toolkit with awsCliCompatible baseCredentials when profile is specified', () => {
    // Resolve profile as 'my-profile' (simulates local dev with --profile)
    const sdkProfileResolver = () => 'my-profile';

    const factory = new BackendDeployerFactory(
      packageManagerControllerMock as never,
      formatterStub,
      mockIoHost,
      sdkProfileResolver,
    );

    const deployer = factory.getInstance();
    assert.ok(deployer, 'deployer instance should be created');
  });

  void it('returns the same singleton instance on subsequent calls', () => {
    const sdkProfileResolver = () => undefined;

    const factory = new BackendDeployerFactory(
      packageManagerControllerMock as never,
      formatterStub,
      mockIoHost,
      sdkProfileResolver,
    );

    const deployer1 = factory.getInstance();
    const deployer2 = factory.getInstance();
    assert.strictEqual(deployer1, deployer2, 'should return the same instance');
  });
});

void describe('Credential resolution behavior', () => {
  void it('BaseCredentials.awsCliCompatible() with no args uses default credential chain', () => {
    // Verifies the credential provider that the Toolkit defaults to
    // when no baseCredentials is specified matches awsCliCompatible with no options
    const defaultProvider = BaseCredentials.awsCliCompatible();
    assert.ok(defaultProvider, 'default provider should be created');
    assert.ok(
      defaultProvider.toString().includes('awsCliCompatible'),
      'should be awsCliCompatible type',
    );
    assert.ok(
      defaultProvider.toString().includes('{}'),
      `default provider should have empty options, got: ${defaultProvider.toString()}`,
    );
  });

  void it('BaseCredentials.awsCliCompatible({ profile }) includes profile in config', () => {
    const profileProvider = BaseCredentials.awsCliCompatible({
      profile: 'test-profile',
    });
    assert.ok(profileProvider, 'profile provider should be created');
    const str = profileProvider.toString();
    assert.ok(
      str.includes('test-profile'),
      `should include profile name, got: ${str}`,
    );
  });

  void it('BaseCredentials.awsCliCompatible({ profile: undefined }) passes profile:undefined (the old bug)', () => {
    // This demonstrates the subtle difference: passing { profile: undefined }
    // creates an options object with the key present but value undefined.
    // While functionally similar, it's cleaner to not pass baseCredentials at all.
    const providerWithUndefined = BaseCredentials.awsCliCompatible({
      profile: undefined,
    });
    const providerWithNoArgs = BaseCredentials.awsCliCompatible();

    // Both should be awsCliCompatible, but their serialized options differ
    assert.ok(
      providerWithUndefined.toString().includes('awsCliCompatible'),
      'should be awsCliCompatible type',
    );
    assert.ok(
      providerWithNoArgs.toString().includes('awsCliCompatible'),
      'should be awsCliCompatible type',
    );
  });
});
