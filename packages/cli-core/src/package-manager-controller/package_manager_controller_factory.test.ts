import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'assert';
import { PackageManagerControllerFactory } from './package_manager_controller_factory.js';
import { PackageManagerControllerBase } from './package_manager_controller_base.js';
import { NpmPackageManagerController } from './npm_package_manager_controller.js';

void describe('packageManagerControllerFactory', () => {
  const packageRoot = '/path/to/project';
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  void describe('getPackageManagerController', () => {
    const testCases = [
      {
        name: 'npm',
        userAgent: 'npm/7.0.0 node/v15.0.0 darwin x64',
        expectedInstanceOf: NpmPackageManagerController,
      },
      {
        name: 'pnpm',
        userAgent: 'pnpm/5.0.0 node/v15.0.0 darwin x64',
        expectedInstanceOf: PackageManagerControllerBase,
      },
      {
        name: 'yarn classic',
        userAgent: 'yarn/1.22.21 node/v15.0.0 darwin x64',
        expectedInstanceOf: PackageManagerControllerBase,
      },
      {
        name: 'yarn modern',
        userAgent: 'yarn/4.0.1 node/v15.0.0 darwin x64',
        expectedInstanceOf: PackageManagerControllerBase,
      },
    ];

    for (const testCase of testCases) {
      void it(`should return the correct package manager controller for ${testCase.name}`, () => {
        const packageManagerControllerFactory =
          new PackageManagerControllerFactory(packageRoot);

        const packageManagerController =
          packageManagerControllerFactory.getPackageManagerController();
        assert.ok(
          packageManagerController instanceof testCase.expectedInstanceOf
        );
      });
    }

    void it('should throw an error for unsupported package managers', () => {
      const userAgent = 'unsupported/1.0.0 node/v15.0.0 darwin x64';
      process.env.npm_config_user_agent = userAgent;
      const packageManagerControllerFactory =
        new PackageManagerControllerFactory(packageRoot);

      assert.throws(
        () => packageManagerControllerFactory.getPackageManagerController(),
        {
          message: 'Package Manager unsupported is not supported.',
        }
      );
    });

    void it('should throw an error for pnpm on Windows', () => {
      const userAgent = 'pnpm/1.0.0 node/v15.0.0 darwin x64';
      process.env.npm_config_user_agent = userAgent;
      const packageManagerControllerFactory =
        new PackageManagerControllerFactory(packageRoot, undefined, 'win32');

      assert.throws(
        () => packageManagerControllerFactory.getPackageManagerController(),
        {
          message: 'Amplify does not support PNPM on Windows.',
          details:
            'Details: https://github.com/aws-amplify/amplify-backend/blob/main/packages/create-amplify/README.md',
        }
      );
    });
  });
});
