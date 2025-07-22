import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { RestApiConstructProps } from './types.js';

/**
 * Rest API construct for Amplify Backend
 */
export class RestApiConstruct extends Construct {
  public readonly api: apigateway.RestApi;
  /**
   * Create a new RestApiConstruct
   */
  constructor(scope: Construct, id: string, props: RestApiConstructProps) {
    super(scope, id);

    // Create a new Lambda function for the API Gateway
    const handler = new lambda.Function(this, 'handler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(props.lambdaEntry),
    });

    // Create a new API Gateway REST API with the specified name
    this.api = new apigateway.RestApi(this, 'RestApi', {
      restApiName: props.apiName,
    });

    // Create a resource for the specified path
    const resource = this.addNestedResource(this.api.root, props.path);

    // Add methods to the resource for each HTTP method specified in props.routes
    for (const method of props.routes) {
      resource.addMethod(method, new apigateway.LambdaIntegration(handler));
    }
  }

  /**
   * Adds nested resources to the API based on the provided path.
   */
  private addNestedResource(
    root: apigateway.IResource,
    path: string,
  ): apigateway.IResource {
    return path.split('/').reduce((resource, part) => {
      return resource.getResource(part) ?? resource.addResource(part);
    }, root);
  }
}
