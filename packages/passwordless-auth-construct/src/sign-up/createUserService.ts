// ../amplify-backend/packages/passwordless-auth-construct/lib/sign-up/createUserService.js

import { CognitoIdentityProviderClient, AdminCreateUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export const createUser = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {

    const params = event && event.body && JSON.parse(event.body);

    if (!params || (!params.email && !params.phone_number) || !params.userPoolId || !params.region) {
        return {
            statusCode: 400,
            body: 'Missing parameters'
        }
    }

    const userAttributes: Array<{ Name: string, Value: string }> = [];
    if (params.email) {
        userAttributes.push({
            Name: "email",
            Value: params.email
        })
    }
    if (params.phone_number) {
        userAttributes.push({
            Name: "phone_number",
            Value: params.phone_number
        })
    }

    const client = new CognitoIdentityProviderClient({ region: params.region });
    const command = new AdminCreateUserCommand({
        Username: params.email || params.phone_number, // what happens when there is both??
        UserPoolId: params.userPoolId,
        UserAttributes: userAttributes,
        MessageAction: "SUPPRESS"
    })

    await client.send(command);
    return {
        statusCode: 200,
        body: JSON.stringify({ test: 200 })
    }
};