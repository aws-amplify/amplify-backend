// ../amplify-backend/packages/passwordless-auth-construct/lib/sign-up/createUserService.js

import {
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PASSWORDLESS_SIGN_UP_ATTR_NAME } from '../constants.js';

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
      !params.region ||
      !params.username
    ) {
      return {
        statusCode: 400,
        body: 'Missing parameters',
      };
    }

    // this is the format for Cognito UserPool API, eslint doesnt like it otherwise
    // eslint-disable-next-line
    const userAttributes: Array<{ Name: string; Value: string }> = [];
    const passwordlessConfiguration: {
      allowSignInAttempt: boolean;
      deliveryMedium?: 'SMS' | 'EMAIL';
    } = {
      allowSignInAttempt: false,
      deliveryMedium: undefined,
    };

    if (params.email) {
      userAttributes.push({
        Name: 'email',
        Value: params.email,
      });
      passwordlessConfiguration.allowSignInAttempt = true;
      passwordlessConfiguration.deliveryMedium = 'EMAIL';
    }

    if (params.phone_number) {
      userAttributes.push({
        Name: 'phone_number',
        Value: params.phone_number,
      });

      passwordlessConfiguration.allowSignInAttempt = true;
      passwordlessConfiguration.deliveryMedium = 'SMS';
    }

    // TODO: what happens if both are included, which one should be valid?

    if (passwordlessConfiguration.allowSignInAttempt) {
      userAttributes.push({
        Name: PASSWORDLESS_SIGN_UP_ATTR_NAME,
        Value: JSON.stringify(passwordlessConfiguration),
      });
    }

    const client = new CognitoIdentityProviderClient({ region: params.region });
    const command = new AdminCreateUserCommand({
      Username: params.username,
      UserPoolId: params.userPoolId,
      UserAttributes: userAttributes,
      MessageAction: 'SUPPRESS',
    });

    try {
      await client.send(command);
    } catch (err) {
      return {
        statusCode: 400,
        body: 'User already exists',
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
