import { describe, it, mock } from 'node:test';
import { SSMClient } from '@aws-sdk/client-ssm';
import { ProjectEnvironmentMainStackNameResolver } from './project_environment_main_stack_name_resolver.js';
import assert from 'node:assert';

describe('ProjectEnvironmentMainStackNameResolver', () => {
  describe('resolveStackName', () => {
    it('throws if corresponding SSM parameter not found', async () => {
      const ssmClientMock = {
        send: mock.fn(() => ({ Parameter: { Other: 'thing' } })),
      } as unknown as SSMClient;
      const projEnvId = {
        projectName: 'testProjName',
        environmentName: 'testEnvName',
      };
      const stackNameResolver = new ProjectEnvironmentMainStackNameResolver(
        ssmClientMock,
        projEnvId
      );

      await assert.rejects(
        stackNameResolver.resolveMainStackName(),
        (err: Error) =>
          err.message.startsWith(
            'Could not resolve string parameter value from'
          )
      );
    });

    it('returns found SSM parameter value', async () => {
      const ssmClientMock = {
        send: mock.fn(() => ({ Parameter: { Value: 'testStackName' } })),
      } as unknown as SSMClient;
      const projEnvId = {
        projectName: 'testProjName',
        environmentName: 'testEnvName',
      };
      const stackNameResolver = new ProjectEnvironmentMainStackNameResolver(
        ssmClientMock,
        projEnvId
      );

      const result = await stackNameResolver.resolveMainStackName();
      assert.equal(result, 'testStackName');
    });
  });
});
