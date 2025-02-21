import { describe, it } from 'node:test';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Dependency,
  getDependenciesFromPackageLock,
} from './get_dependencies_from_package_lock.js';
import assert from 'assert';

void describe('getDependenciesFromPackageLock', () => {
  const testResourcesPath = fileURLToPath(
    new URL('./test-resources', import.meta.url)
  );
  const packageLockJsonPath = path.join(
    testResourcesPath,
    'package_lock_valid.json'
  );

  void it('can get dependencies from package-lock.json', async () => {
    const dependencies = await getDependenciesFromPackageLock(
      packageLockJsonPath
    );
    /* eslint-disable spellcheck/spell-checker */
    const expectedDependencies: Dependency[] = [
      { name: 'ansi-regex', version: '5.0.1' },
      { name: 'ansi-styles', version: '4.3.0' },
      { name: 'cliui', version: '8.0.1' },
      { name: 'color-convert', version: '2.0.1' },
      { name: 'color-name', version: '1.1.4' },
      { name: 'emoji-regex', version: '8.0.0' },
      { name: 'escalade', version: '3.1.1' },
      { name: 'get-caller-file', version: '2.0.5' },
      { name: 'is-fullwidth-code-point', version: '3.0.0' },
      { name: 'require-directory', version: '2.1.1' },
      { name: 'string-width', version: '4.2.3' },
      { name: 'strip-ansi', version: '6.0.1' },
      { name: 'wrap-ansi', version: '7.0.0' },
      { name: 'y18n', version: '5.0.8' },
      { name: 'yargs', version: '17.7.2' },
      { name: 'yargs-parser', version: '21.1.1' },
      { name: 'zod', version: '3.22.4' },
    ];
    /* eslint-enable spellcheck/spell-checker */
    assert.deepStrictEqual(dependencies, expectedDependencies);
  });
});
