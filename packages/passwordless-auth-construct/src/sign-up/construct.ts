import { Construct } from 'constructs';
import { CustomAuthTriggers } from '../types.js';
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
    });

    const putCreateUserIntegration = new apigateway.LambdaIntegration(
      createUserFunction,
      {
        requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
      }
    );

    api.root.addMethod('PUT', putCreateUserIntegration);

    const createUserPolicy = new Policy(this, `CreateUserPolicy${id}`, {});
    createUserFunction.role!.attachInlinePolicy(createUserPolicy);
    const createUserPolicyStatement = new PolicyStatement();
    createUserPolicyStatement.addActions('cognito-idp:AdminCreateUser');
    createUserPolicyStatement.addResources(userPool.userPoolArn);
    createUserPolicyStatement.effect = Effect.ALLOW;
    createUserPolicy.addStatements(createUserPolicyStatement);

    const updateUserPolicy = new Policy(this, `UpdateUserPolicy${id}`, {});
    const updateUserPolicyStatement = new PolicyStatement();
    updateUserPolicyStatement.addActions(
      'cognito-idp:AdminUpdateUserAttributes'
    );
    updateUserPolicyStatement.addResources(userPool.userPoolArn);
    updateUserPolicyStatement.effect = Effect.ALLOW;
    updateUserPolicy.addStatements(updateUserPolicyStatement);
    verifyAuthChallengeResponse.role!.attachInlinePolicy(updateUserPolicy);
  }
}
