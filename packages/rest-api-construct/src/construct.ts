import { Construct } from 'constructs';
import * as apiGateway from 'aws-cdk-lib/aws-apigateway';
import { RestApiConstructProps } from './types.js';
import { validateRestApiPaths } from './validate_paths.js';

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

    //check that the paths are valid before creating the API
    const paths: string[] = [];
    props.apiProps.forEach((value) => paths.push(value.path));
    validateRestApiPaths(paths);

    // Create a new API Gateway REST API with the specified name
    this.api = new apiGateway.RestApi(this, 'RestApi', {
      restApiName: props.apiName,
    });

    // Iterate over each path configuration
    for (const pathConfig of props.apiProps) {
      const { path, methods, lambdaEntry } = pathConfig;
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
