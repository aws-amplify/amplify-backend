import { before, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { DependenciesValidator } from './dependencies_validator.js';
import { ExecaChildProcess } from 'execa';
import fsp from 'fs/promises';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

void describe('Dependency validator', () => {
  const execaMock = mock.fn();

  before(async () => {
    const testNpmOutputFilePath = fileURLToPath(
      new URL('./test-resources/npm_ls_output.json', import.meta.url)
    );
    const testNpmOutput = (
      await fsp.readFile(testNpmOutputFilePath)
    ).toString();
    execaMock.mock.mockImplementation(() => {
      return {
        stdout: testNpmOutput,
      } as unknown as ExecaChildProcess;
    });
  });

  void it('should throw if globally forbidden dependencies are found', async () => {
    await assert.rejects(
      () =>
        new DependenciesValidator(
          ['packages/cli'],
          {
            '@inquirer/prompts': {
              denyAll: true,
            },
            graphql: {
              denyAll: true,
            },
          },
          [],
          execaMock as never
        ).validate(),
      (err: Error) => {
        assert.ok(err.message.includes('@inquirer/prompts'));
        assert.ok(err.message.includes('graphql'));
        return true;
      }
    );
  });

  void it('should throw if non-allow-listed dependencies are found', async () => {
    await assert.rejects(
      () =>
        new DependenciesValidator(
          ['packages/cli'],
          {
            '@inquirer/prompts': {
              allowList: ['non-existent-package'],
            },
            graphql: {
              allowList: ['non-existent-package'],
            },
          },
          [],
          execaMock as never
        ).validate(),
      (err: Error) => {
        assert.ok(err.message.includes('@inquirer/prompts'));
        assert.ok(err.message.includes('graphql'));
        return true;
      }
    );
  });

  void it('passes if rules are followed', async () => {
    // does not throw
    await new DependenciesValidator(
      ['packages/cli'],
      {
        'non-existent-package': {
          denyAll: true,
        },
        graphql: {
          allowList: ['@aws-amplify/backend-cli'],
        },
      },
      [],
      execaMock as never
    ).validate();
  });

  void it('should discover nested dependency and de-duplicate', async () => {
    // This test uses 'color-name' intentionally.
    // See ./test-resources/npm_ls_output.json.
    // The 'color-name' is nested and appears multiple times in sample output.
    await assert.rejects(
      () =>
        new DependenciesValidator(
          ['packages/cli'],
          {
            'color-name': {
              denyAll: true,
            },
          },
          [],
          execaMock as never
        ).validate(),
      (err: Error) => {
        // The 'color-name' must appear only once in the output.
        assert.strictEqual(
          err.message,
          'Package @aws-amplify/backend-cli must not have color-name anywhere in dependency graph'
        );
        return true;
      }
    );
  });

  void it('can detect inconsistent dependency declarations', async () => {
    await assert.rejects(
      async () => {
        const packagePaths = await glob(
          'scripts/components/test-resources/dependency-version-consistency-test-packages/*'
        );
        await new DependenciesValidator(
          packagePaths,
          {},
          [],
          execaMock as never
        ).validate();
      },
      (err: Error) => {
        assert.ok(
          err.message.includes('is declared using inconsistent versions')
        );
        assert.ok(err.message.includes('glob'));
        assert.ok(err.message.includes('zod'));
        assert.ok(err.message.includes('yargs'));
        assert.ok(err.message.includes('package1'));
        assert.ok(err.message.includes('package2'));
        return true;
      }
    );
  });

  void it('can detect inconsistent dependency declarations of linked dependencies', async () => {
    await assert.rejects(
      async () => {
        const packagePaths = await glob(
          'scripts/components/test-resources/dependency-linked-version-consistency-test-packages/*'
        );
        await new DependenciesValidator(
          packagePaths,
          {},
          [['aws-cdk', 'aws-cdk-lib']],
          execaMock as never
        ).validate();
      },
      (err: Error) => {
        assert.ok(
          err.message.includes('should be declared using same version')
        );
        assert.ok(err.message.includes('aws-cdk'));
        assert.ok(err.message.includes('aws-cdk-lib'));
        return true;
      }
    );
  });
});
