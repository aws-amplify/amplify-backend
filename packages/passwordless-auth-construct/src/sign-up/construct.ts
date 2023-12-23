import { Construct } from 'constructs';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { CfnOutput } from 'aws-cdk-lib';
import { PasswordlessSignUpProps } from '../types.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/**
 * Amplify SignUp Passwordless construct
 */
export class AmplifyPasswordlessSignUp extends Construct {
  /**
   * Create a new SignUp Passwordless construct
   * verifyAuthChallengeResponse function is needed in order to attach policy
   * userPool is needed to identity the resource and create the policy for verifyAuthChallengeResponse
   */
  constructor(
    scope: Construct,
    id: string,
    passwordlessSignUpProps: PasswordlessSignUpProps
  ) {
    super(scope, id);

    const createUserFunction = new NodejsFunction(scope, `CreateUser${id}`, {
      handler: 'createUser',
      entry: path.join(dirname, 'create_user_handler.js'),
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      bundling: {
        format: OutputFormat.ESM,
      },
    });

    const api = new apigateway.RestApi(this, `CreateUserApi${id}`, {
      restApiName: 'Create User service',
      description: 'This service creates users.',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
      },
    });

    const putCreateUserIntegration = new apigateway.LambdaIntegration(
      createUserFunction,
      {
        requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
      }
    );

    api.root.addMethod('PUT', putCreateUserIntegration);

    // TODO: expose this on the external stack
    new CfnOutput(this, 'apiUrl', { value: api.url });

    // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
    createUserFunction.role!.attachInlinePolicy(
      new Policy(this, `CreateUserPolicy${id}`, {
        statements: [
          new PolicyStatement({
            actions: ['cognito-idp:AdminCreateUser'],
            resources: [passwordlessSignUpProps.userPool.userPoolArn],
            effect: Effect.ALLOW,
          }),
        ],
      })
    );

    passwordlessSignUpProps.verifyExecutionRole.attachInlinePolicy(
      new Policy(this, `UpdateUserPolicy${id}`, {
        statements: [
          new PolicyStatement({
            actions: [
              'cognito-idp:AdminUpdateUserAttributes',
              'cognito-idp:AdminDeleteUserAttributes',
            ],
            resources: [passwordlessSignUpProps.userPool.userPoolArn],
            effect: Effect.ALLOW,
          }),
        ],
      })
    );
  }
}
