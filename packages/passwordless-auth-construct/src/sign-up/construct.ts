import { Construct } from 'constructs';
import {
  NodejsFunction,
  NodejsFunctionProps,
  OutputFormat,
} from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/**
 * Amplify SignUp Passwordless construct
 */
export class AmplifySignUpPasswordless extends Construct {
  /**
   * Create a new SignUp Passwordless construct
   * verifyAuthChallengeResponse function is needed in order to attach policy
   * userPool is needed to identity the resource and create the policy for verifyAuthChallengeResponse
   */
  constructor(
    scope: Construct,
    id: string,
    verifyAuthChallengeResponse: NodejsFunction,
    userPool: IUserPool
  ) {
    super(scope, id);

    // default memory allocation for lambda functions
    const defaultMemorySize = 128;

    const commonOptions: NodejsFunctionProps = {
      entry: path.join(dirname, '.', 'create_user_service.js'),
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      bundling: {
        format: OutputFormat.ESM,
      },
    };

    const createUserFunction = new NodejsFunction(scope, `CreateUser${id}`, {
      handler: 'createUser',
      ...commonOptions,
      memorySize: defaultMemorySize,
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

    createUserFunction.role!.attachInlinePolicy(
      new Policy(this, `CreateUserPolicy${id}`, {
        statements: [
          new PolicyStatement({
            actions: ['cognito-idp:AdminCreateUser'],
            resources: [userPool.userPoolArn],
            effect: Effect.ALLOW,
          }),
        ],
      })
    );

    verifyAuthChallengeResponse.role!.attachInlinePolicy(
      new Policy(this, `UpdateUserPolicy${id}`, {
        statements: [
          new PolicyStatement({
            actions: [
              'cognito-idp:AdminUpdateUserAttributes',
              'cognito-idp:AdminDeleteUserAttributes',
            ],
            resources: [userPool.userPoolArn],
            effect: Effect.ALLOW,
          }),
        ],
      })
    );
  }
}
