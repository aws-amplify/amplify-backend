/* eslint-disable spellcheck/spell-checker */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  CloudFormationClient,
  CreateStackCommand,
  UpdateStackCommand,
} from '@aws-sdk/client-cloudformation';

/**
 * The unit tests mock `Toolkit.deploy`, so they only assert we *ask* for Express
 * mode, not that it reaches CloudFormation. This exercises the real resolved
 * `@aws-sdk/client-cloudformation` and asserts `DeploymentConfig.Mode=EXPRESS` is
 * serialized onto the request. Older SDKs (< 3.1077.0) drop the field, silently
 * turning `--express` into a STANDARD deployment; this test catches that.
 */
void describe('Express mode reaches the CloudFormation request', () => {
  /**
   * Sends a command through a real CloudFormationClient whose request handler
   * captures the serialized HTTP request body and short-circuits before any
   * network call is made.
   */
  const captureSerializedRequest = async (
    command: unknown,
  ): Promise<string> => {
    let capturedBody = '';
    const client = new CloudFormationClient({
      region: 'us-east-1',
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
      requestHandler: {
        handle: async (request: { body?: string }) => {
          capturedBody = typeof request.body === 'string' ? request.body : '';
          throw new Error('__request_captured__');
        },
      } as never,
    });

    try {
      await client.send(command as never);
    } catch (error) {
      if (!String(error).includes('__request_captured__')) {
        throw error;
      }
    }

    return capturedBody;
  };

  // The sandbox `--express` path performs a direct CloudFormation deployment,
  // which issues CreateStack (new stack) or UpdateStack (existing stack).
  const commands = [
    {
      name: 'CreateStack',
      command: new CreateStackCommand({
        StackName: 'test-express-stack',
        DeploymentConfig: { Mode: 'EXPRESS' },
      }),
    },
    {
      name: 'UpdateStack',
      command: new UpdateStackCommand({
        StackName: 'test-express-stack',
        DeploymentConfig: { Mode: 'EXPRESS' },
      }),
    },
  ];

  commands.forEach(({ name, command }) => {
    void it(`serializes DeploymentConfig.Mode=EXPRESS on ${name}`, async () => {
      const body = await captureSerializedRequest(command);
      assert.match(
        body,
        /DeploymentConfig\.Mode=EXPRESS/,
        `Express mode was not serialized onto the ${name} request. The resolved ` +
          '@aws-sdk/client-cloudformation likely predates DeploymentConfig support (>= 3.1077.0).',
      );
    });
  });
});
