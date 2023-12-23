import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoUserService } from '../services/cognito_user_service.js';
import { logger } from '../logger.js';

const cognitoCreateUserService = new CognitoUserService(
  new CognitoIdentityProviderClient()
);

/**
 * The Create User for Passwordless SignUp lambda handler
 * @param event - The event provided by ApiGateway for the request
 * @returns the response, including status code and response body
 */
export const createUser = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  let params: {
    userPoolId?: string;
    email?: string;
    phoneNumber?: string;
    username?: string;
  } = {};

  try {
    params = event && event.body && JSON.parse(event.body);
  } catch (err) {
    logger.debug(err);

    return {
      statusCode: 400,
      body: 'Invalid parameters',
    };
  }

  if (
    !params ||
    (!params.email && !params.phoneNumber) ||
    !params.userPoolId ||
    !params.username
  ) {
    const missedParameters: string[] = [];

    if (!params.userPoolId) {
      missedParameters.push('userPoolId');
    }

    if (!params.username) {
      missedParameters.push('username');
    }

    if (!params.email && !params.phoneNumber) {
      missedParameters.push('email or phoneNumber');
    }

    return {
      statusCode: 400,
      body: JSON.stringify({
        error: `Missing parameters: ${missedParameters.join(',')}`,
      }),
    };
  }

  try {
    await cognitoCreateUserService.createUser({
      username: params.username,
      userPoolId: params.userPoolId,
      email: params.email,
      phoneNumber: params.phoneNumber,
    });
  } catch (err) {
    logger.debug(err);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: (err as Error).message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({}),
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  };
};
