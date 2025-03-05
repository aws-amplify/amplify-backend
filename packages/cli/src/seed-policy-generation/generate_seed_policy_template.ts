import { Effect, PolicyDocument, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { generateClientConfig } from '@aws-amplify/client-config';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  AmplifyUserError,
  ParameterPathConversions,
} from '@aws-amplify/platform-core';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';

/**
 * Generates policy template which allows seed to be run
 * @param backendId - backend identifier
 * @returns - policy template as a string
 */
export const generateSeedPolicyTemplate = async (
  backendId: BackendIdentifier,
  generateClientConfiguration = generateClientConfig,
  stsClient = new STSClient()
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
  // /const userPoolId = clientConfig.auth?.user_pool_id;

  const stsResponse = await stsClient.send(new GetCallerIdentityCommand({}));
  const arn = `arn:aws:cognito-idp:${clientConfig.auth.aws_region}:${stsResponse.Account}:userpool/${clientConfig.auth.user_pool_id}`;
  /*const userpoolOutput = await cognitoIdProvider.send(
    new DescribeUserPoolCommand({ UserPoolId: userPoolId })
  );
  const userpoolArn = userpoolOutput.UserPool?.Arn;
  // so long as there is an auth resource we should always be able to get an Arn for the userpool
  if (!userpoolArn) {
    throw new AmplifyFault('MissingUserpoolArnFault', {
      message:
        'Either the userpool is missing or the userpool exists but it is missing an arn',
      resolution: 'Ensure your userpool exists and has an arn',
    });
  }*/
  const cognitoGrant = new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['cognito-idp:AdminCreateUser', 'cognito-idp:AdminAddUserToGroup'],
    resources: [arn],
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
