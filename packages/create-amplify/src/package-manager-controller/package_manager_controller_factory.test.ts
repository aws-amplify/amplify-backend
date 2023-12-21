import { describe, it } from 'node:test';
import assert from 'assert';
import { PackageManagerControllerFactory } from './package_manager_controller_factory.js';

void describe('packageManagerControllerFactory', () => {
  const packageRoot = '/path/to/project';

  void describe('getPackageManagerController', () => {
    void it('should return the correct package manager controller for npm', () => {
      const packageManagerControllerFactory =
        new PackageManagerControllerFactory(
          packageRoot,
          'npm/7.0.0 node/v15.0.0 darwin x64'
        );

      const packageManagerController =
        packageManagerControllerFactory.getPackageManagerController();
      assert.match(packageManagerController.executable, /npm/);
      assert.match(packageManagerController.binaryRunner, /npx/);
      assert.equal(packageManagerController.addTypescript, undefined);
      assert.equal(packageManagerController.addLockFile, undefined);
    });

    void it('should return the correct package manager controller for pnpm', () => {
      const packageManagerControllerFactory =
        new PackageManagerControllerFactory(
          packageRoot,
          'pnpm/5.0.0 node/v15.0.0 darwin x64'
        );

      const packageManagerController =
        packageManagerControllerFactory.getPackageManagerController();
      assert.match(packageManagerController.executable, /pnpm/);
      assert.match(packageManagerController.binaryRunner, /pnpm/);
      assert.equal(packageManagerController.addTypescript, undefined);
      assert.equal(packageManagerController.addLockFile, undefined);
    });

    void it('should return the correct package manager controller for yarn classic', () => {
      const packageManagerControllerFactory =
        new PackageManagerControllerFactory(
          packageRoot,
          'yarn/1.0.0 node/v15.0.0 darwin x64'
        );

      const packageManagerController =
        packageManagerControllerFactory.getPackageManagerController();
      assert.match(packageManagerController.executable, /yarn/);
      assert.match(packageManagerController.installCommand, /add/);
      assert.ok(packageManagerController.addTypescript);
      assert.equal(packageManagerController.addLockFile, undefined);
    });

    void it('should return the correct package manager controller for yarn modern', () => {
      const packageManagerControllerFactory =
        new PackageManagerControllerFactory(
          packageRoot,
          'yarn/2.0.0 node/v15.0.0 darwin x64'
        );

      const packageManagerController =
        packageManagerControllerFactory.getPackageManagerController();
      assert.match(packageManagerController.executable, /yarn/);
      assert.match(packageManagerController.installCommand, /add/);
      assert.ok(packageManagerController.addLockFile);
      assert.ok(packageManagerController.addTypescript);
    });

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
