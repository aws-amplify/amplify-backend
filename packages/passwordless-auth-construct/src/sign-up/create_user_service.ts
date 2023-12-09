// ../amplify-backend/packages/passwordless-auth-construct/lib/sign-up/createUserService.js

import {
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * The Create User for Passwordless SignUp lambda handler
 * @param event - The event provided by ApiGateway for the request
 * @returns the response, including status code and response body
 */
export const createUser = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const params = event && event.body && JSON.parse(event.body);

  if (
    !params ||
    (!params.email && !params.phone_number) ||
    !params.userPoolId ||
    !params.region ||
    !params.username
  ) {
    return {
      statusCode: 400,
      body: 'Missing parameters',
    };
  }

  // eslint-disable-next-line
  const userAttributes: Array<{ Name: string; Value: string }> = [];

  if (params.email) {
    userAttributes.push({
      Name: 'email',
      Value: params.email,
    });
  }

  if (params.phone_number) {
    userAttributes.push({
      Name: 'phone_number',
      Value: params.phone_number,
    });
  }

  userAttributes.push({
    Name: 'custom:_passwordless_signup',
    Value: 'true',
  });

  const client = new CognitoIdentityProviderClient({ region: params.region });
  const command = new AdminCreateUserCommand({
    Username: params.username,
    UserPoolId: params.userPoolId,
    UserAttributes: userAttributes,
    MessageAction: 'SUPPRESS',
  });

  await client.send(command);

  return {
    statusCode: 200,
    body: 'SUCCESS',
  };
};
