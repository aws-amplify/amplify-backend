import { Construct } from 'constructs';
import * as apiGateway from 'aws-cdk-lib/aws-apigateway';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { MethodsProps, RestApiConstructProps } from './types.js';

/**
 *
 */
export class RestApiConstruct extends Construct {
  public readonly api: apiGateway.RestApi;
  private readonly userPoolAuthorizer?: apiGateway.CognitoUserPoolsAuthorizer;

  /**
   * Creates a new REST API in API Gateway with optional Cognito User Pool authorization.
   *
   * If a user pool is provided, all routes default to using it for authentication unless overridden.
   * @param scope - The scope in which this construct is defined.
   * @param id - The unique identifier for this construct.
   * @param props - Configuration options for the REST API, including name and route definitions.
   * @param userPool - Optional Cognito User Pool to use as the default authorizer.
   */
  constructor(
    scope: Construct,
    id: string,
    props: RestApiConstructProps,
    userPool?: IUserPool,
  ) {
    super(scope, id);

    // Create API
    this.api = new apiGateway.RestApi(this, 'RestApi', {
      restApiName: props.apiName,
    });

    // If userPool exists, create default authorizer
    if (userPool) {
      this.userPoolAuthorizer = new apiGateway.CognitoUserPoolsAuthorizer(
        this,
        'DefaultUserPoolAuth',
        {
          cognitoUserPools: [userPool],
        },
      );
    }

    for (const pathConfig of props.apiProps) {
      const resource = this.addNestedResource(this.api.root, pathConfig.path);

      for (const method of pathConfig.methods) {
        const integration = new apiGateway.LambdaIntegration(
          pathConfig.lambdaEntry.resources.lambda,
        );

        resource.addMethod(method.method, integration, {
          authorizer: this.getAuthorizerForMethod(method),
          authorizationType: this.getAuthorizationType(method),
        });
      }
    }
  }

  /**
   *
   * If the method specifies a user pool authorizer, it returns the default user pool authorizer.
   * If no authorizer is specified but a user pool exists, it returns the default user pool authorizer.
   * Otherwise, it returns undefined.
   */

  private getAuthorizerForMethod(method: MethodsProps) {
    if (method.authorizer?.type === 'userPool' && this.userPoolAuthorizer) {
      return this.userPoolAuthorizer;
    }
    if (!method.authorizer && this.userPoolAuthorizer) {
      return this.userPoolAuthorizer;
    }
    return undefined;
  }

  /**
   * Determines the authorization type based on the method's authorizer configuration.
   * If a user pool authorizer is set or if no authorizer is specified but a user pool exists, it returns COGNITO.
   * Otherwise, it returns NONE.
   */

  private getAuthorizationType(method: MethodsProps) {
    if (
      method.authorizer?.type === 'userPool' ||
      (!method.authorizer && this.userPoolAuthorizer)
    ) {
      return apiGateway.AuthorizationType.COGNITO;
    }
    return apiGateway.AuthorizationType.NONE;
  }

  /**
   * Adds nested resources to the API based on the provided path.
   */
  private addNestedResource(
    root: apiGateway.IResource,
    path: string,
  ): apiGateway.IResource {
    //remove the leading slash to prevent empty id error
    if (path.startsWith('/')) path = path.substring(1);

    // Split the path into parts (e.g. "posts/comments" → ["posts", "comments"])
    const parts = path.split('/');

    // Traverse the path, adding any missing nested resources along the way
    let current = root;
    for (const part of parts) {
      const existing = current.getResource(part);
      current = existing ?? current.addResource(part);
    }

    return current;
  }
}
