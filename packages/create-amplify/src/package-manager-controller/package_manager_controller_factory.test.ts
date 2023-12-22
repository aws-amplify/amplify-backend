import { describe, it } from 'node:test';
import assert from 'assert';
import { PackageManagerControllerFactory } from './package_manager_controller_factory.js';
import { PackageManagerController } from './package_manager_controller.js';
import { NpmPackageManagerController } from './npm_package_manager_controller.js';

void describe('packageManagerControllerFactory', () => {
  const packageRoot = '/path/to/project';

  void describe('getPackageManagerController', () => {
    const testCases = [
      {
        name: 'npm',
        userAgent: 'npm/7.0.0 node/v15.0.0 darwin x64',
        expectedInstanceof: NpmPackageManagerController,
      },
      {
        name: 'pnpm',
        userAgent: 'pnpm/5.0.0 node/v15.0.0 darwin x64',
        expectedInstanceof: PackageManagerController,
      },
      {
        name: 'yarn classic',
        userAgent: 'yarn/1.22.21 node/v15.0.0 darwin x64',
        expectedInstanceof: PackageManagerController,
      },
      {
        name: 'yarn modern',
        userAgent: 'yarn/4.0.1 node/v15.0.0 darwin x64',
        expectedInstanceof: PackageManagerController,
      },
    ];

    for (const testCase of testCases) {
      void it(`should return the correct package manager controller for ${testCase.name}`, () => {
        const packageManagerControllerFactory =
          new PackageManagerControllerFactory(packageRoot, testCase.userAgent);

        const packageManagerController =
          packageManagerControllerFactory.getPackageManagerController();
        assert.ok(
          packageManagerController instanceof testCase.expectedInstanceof
        );
      });
    }

    void it('should throw an error for unsupported package managers', () => {
      const packageManagerControllerFactory =
        new PackageManagerControllerFactory(packageRoot, 'unsupported');
      assert.throws(
        () => packageManagerControllerFactory.getPackageManagerController(),
        Error,
        'Package Manager unsupported is not supported.'
      );
    });
  });
});
