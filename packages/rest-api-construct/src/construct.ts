import { Construct } from 'constructs';
import * as apiGateway from 'aws-cdk-lib/aws-apigateway';
import { RestApiConstructProps } from './types.js';

/**
 * Rest API construct for Amplify Backend
 */
export class RestApiConstruct extends Construct {
  public readonly api: apiGateway.RestApi;
  /**
   * Create a new RestApiConstruct
   */
  constructor(scope: Construct, id: string, props: RestApiConstructProps) {
    super(scope, id);

    // Create a new API Gateway REST API with the specified name
    this.api = new apiGateway.RestApi(this, 'RestApi', {
      restApiName: props.apiName,
    });

    // Iterate over each path configuration
    for (const pathConfig of Object.entries(props.apiProps)) {
      const { path, methods, lambdaEntry } = pathConfig[1];
      // Add resource and methods for this route
      const resource = this.addNestedResource(this.api.root, path);
      for (const method of methods) {
        resource.addMethod(
          method.method,
          new apiGateway.LambdaIntegration(lambdaEntry.resources.lambda),
        );
      }
    }
  }

  /**
   * Adds nested resources to the API based on the provided path.
   */
  private addNestedResource(
    root: apiGateway.IResource,
    path: string,
  ): apiGateway.IResource {
    //TODO: remove leading/trailing slashes from path and check it is not an empty string? eg /items, items/stuff/, /
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
