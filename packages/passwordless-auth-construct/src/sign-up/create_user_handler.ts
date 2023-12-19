import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoUserService } from '../services/cognito_user_service.js';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
/**
 * The Create User for Passwordless SignUp lambda handler
 * @param event - The event provided by ApiGateway for the request
 * @returns the response, including status code and response body
 */
export const createUser = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const params = event && event.body && JSON.parse(event.body);

    if (
      !params ||
      (!params.email && !params.phone_number) ||
      !params.userPoolId ||
      !params.username
    ) {
      return {
        statusCode: 400,
        body: 'Missing parameters',
      };
    }

    try {
      const cognitoCreateUserService = new CognitoUserService(
        new CognitoIdentityProviderClient()
      );
      await cognitoCreateUserService.createUser({
        username: params.username,
        userPoolId: params.userPoolId,
        email: params.email,
        phone_number: params.phone_number,
      });
    } catch (err) {
      return {
        statusCode: 400,
        body: (err as Error).message,
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
  } catch (err) {
    return {
      statusCode: 400,
      body: 'Invalid parameters',
    };
  }
};
