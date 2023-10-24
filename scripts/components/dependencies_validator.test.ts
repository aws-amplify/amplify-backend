import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DependenciesValidator } from './dependencies_validator.js';

void describe('Dependency validator', () => {
  void it('should throw if globally forbidden dependencies are found', async () => {
    await assert.rejects(
      () =>
        new DependenciesValidator(['packages/cli'], {
          '@inquirer/prompts': {
            denyAll: true,
          },
          graphql: {
            denyAll: true,
          },
        }).validate(),
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
        new DependenciesValidator(['packages/cli'], {
          '@inquirer/prompts': {
            allowList: ['non-existent-package'],
          },
          graphql: {
            allowList: ['non-existent-package'],
          },
        }).validate(),
      (err: Error) => {
        assert.ok(err.message.includes('@inquirer/prompts'));
        assert.ok(err.message.includes('graphql'));
        return true;
      }
    );
  });

  void it('passes if rules are followed', async () => {
    // does not throw
    await new DependenciesValidator(['packages/cli'], {
      'non-existent-package': {
        denyAll: true,
      },
      graphql: {
        allowList: ['@aws-amplify/backend-cli'],
      },
    }).validate();
  });
});
