import { before, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { DependenciesValidator } from './dependencies_validator.js';
import { ExecaChildProcess } from 'execa';
import fsp from 'fs/promises';
import { fileURLToPath } from 'url';

void describe('Dependency validator', () => {
  const execaMock = mock.fn();

  before(async () => {
    const testNpmOutputFilePath = fileURLToPath(
      new URL('./test_resources/npm_ls_output.json', import.meta.url)
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
      execaMock as never
    ).validate();
  });

  void it('should discover nested dependencies and de-duplicate', async () => {
    // This test uses 'color-name' intentionally.
    // See ./test_resources/npm_ls_output.json.
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
});
