import { Effect, PolicyDocument, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { generateClientConfig } from '@aws-amplify/client-config';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  CognitoIdentityProviderClient,
  DescribeUserPoolCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  AmplifyUserError,
  ParameterPathConversions,
} from '@aws-amplify/platform-core';
import assert from 'assert';

/**
 * Generates policy template which allows seed to be run
 * @param backendId - backend identifier
 * @returns - policy template as a string
 */
export const generateSeedPolicyTemplate = async (
  backendId: BackendIdentifier,
  generateClientConfiguration = generateClientConfig,
  cognitoIdProvider = new CognitoIdentityProviderClient()
): Promise<PolicyDocument> => {
  const seedPolicy = new PolicyDocument();
  const clientConfig = await generateClientConfiguration(backendId, '1.3');

  if (!clientConfig.auth) {
    throw new AmplifyUserError('MissingAuthError', {
      message: 'There is no auth resource in this sandbox',
      resolution:
        'Please add an auth resource to your sandbox and rerun this command',
    });
  }
  const userPoolId = clientConfig.auth?.user_pool_id;

  const userpoolOutput = await cognitoIdProvider.send(
    new DescribeUserPoolCommand({ UserPoolId: userPoolId })
  );
  const userpoolArn = userpoolOutput.UserPool?.Arn;
  // so long as there is an auth resource we should always be able to get an Arn for the userpool
  assert.ok(userpoolArn);
  const cognitoGrant = new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['cognito-idp:AdminCreateUser', 'cognito-idp:AdminAddUserToGroup'],
    resources: [userpoolArn],
  });

  const backendParamPrefix =
    ParameterPathConversions.toParameterPrefix(backendId);
  const sharedParamPrefix = ParameterPathConversions.toParameterPrefix(
    backendId.namespace
  );

  const secretsGrant = new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['ssm:PutParameter', 'ssm:GetParameter'],
    resources: [
      `arn:aws:ssm:*:*:parameter${backendParamPrefix}/*`,
      `arn:aws:ssm:*:*:parameter${sharedParamPrefix}/*`,
    ],
  });

  seedPolicy.addStatements(cognitoGrant, secretsGrant);

  return seedPolicy;
};
