import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { BackendDeployerFactory } from './cdk_deployer_singleton_factory.js';
import type {
  AmplifyIOHost,
  PackageManagerController,
} from '@aws-amplify/plugin-types';
import type { BackendDeployerOutputFormatter } from './types.js';
import { BaseCredentials } from '@aws-cdk/toolkit-lib';

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

  void it('creates deployer without explicit credentials when no profile is set', () => {
    // Container/CI scenario - no profile specified
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

  void it('creates deployer with profile-specific credentials when profile is set', () => {
    // Local development with --profile flag
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

void describe('BaseCredentials credential provider behavior', () => {
  void it('creates default provider when called without arguments', () => {
    const defaultProvider = BaseCredentials.awsCliCompatible();
    assert.ok(defaultProvider, 'provider should be created');
    assert.ok(
      defaultProvider.toString().includes('awsCliCompatible'),
      'should use awsCliCompatible strategy',
    );
  });

  void it('creates provider with profile configuration when profile is specified', () => {
    const profileProvider = BaseCredentials.awsCliCompatible({
      profile: 'test-profile',
    });
    assert.ok(profileProvider, 'provider should be created');
    const str = profileProvider.toString();
    assert.ok(
      str.includes('test-profile'),
      `should reference the profile: ${str}`,
    );
  });

  void it('constructs sdkConfig without baseCredentials when profile is undefined', () => {
    // Verify the fix: when profile is undefined, don't pass baseCredentials at all
    const profile: string | undefined = undefined;
    
    const sdkConfig = profile
      ? {
          baseCredentials: BaseCredentials.awsCliCompatible({ profile }),
        }
      : {};

    assert.deepStrictEqual(sdkConfig, {}, 'sdkConfig should be empty');
    assert.strictEqual(
      'baseCredentials' in sdkConfig,
      false,
      'baseCredentials key should not exist',
    );
  });

  void it('constructs sdkConfig with baseCredentials when profile is set', () => {
    const profile: string | undefined = 'dev-profile';
    
    const sdkConfig = profile
      ? {
          baseCredentials: BaseCredentials.awsCliCompatible({ profile }),
        }
      : {};

    assert.ok(
      'baseCredentials' in sdkConfig,
      'baseCredentials key should exist when profile is set',
    );
  });
});
