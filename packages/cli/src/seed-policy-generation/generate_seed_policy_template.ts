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

/**
 * Generates policy template which allows seed to be run
 * @param backendId - backend identifier
 * @returns - policy template as a string
 */
export const generateSeedPolicyTemplate = async (
  backendId: BackendIdentifier
): Promise<string> => {
  const seedPolicy = new PolicyDocument();
  const clientConfig = await generateClientConfig(backendId, '1.3');

  const userPoolId = clientConfig.auth?.user_pool_id;
  const cognitoIdProviderClient = new CognitoIdentityProviderClient();
  const userpoolOutput = await cognitoIdProviderClient.send(
    new DescribeUserPoolCommand({ UserPoolId: userPoolId })
  );
  const userpoolArn = userpoolOutput.UserPool?.Arn;

  if (!userpoolArn) {
    throw new AmplifyUserError('MissingUserPoolError', {
      message: `Userpool with ID: ${userPoolId} does not exist`,
      resolution:
        'Try rerunning ampx sandbox or regenerating your backend outputs with ampx generate outputs',
    });
  }

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

  return JSON.stringify(seedPolicy.toJSON(), null, 1);
};
