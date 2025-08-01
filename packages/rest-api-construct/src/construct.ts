import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apiGateway from 'aws-cdk-lib/aws-apigateway';
import {
  ExistingDirectory,
  ExistingLambda,
  NewFromCode,
  RestApiConstructProps,
} from './types.js';

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
    for (const [index, pathConfig] of Object.entries(props.apiProps)) {
      const { path, methods, lambdaEntry } = pathConfig;
      const source = lambdaEntry.source;

      // Determine Lambda code source - either ExistingDirectory, NewFromCode, or ExistingLambda (function already exists in aws and does not need to be constructed)
      let code!: lambda.AssetCode | lambda.InlineCode;
      if ('path' in source) {
        const src = source as ExistingDirectory;
        code = lambda.Code.fromAsset(src.path);
      } else if ('code' in source) {
        const src = source as NewFromCode;
        code = lambda.Code.fromInline(src.code);
      }
      //if none of these are true, it's a ExistingLambda type, handled below

      // Create or reference Lambda function
      let handler: lambda.IFunction;
      if ('id' in source) {
        const src = source as ExistingLambda;
        handler = lambda.Function.fromFunctionName(this, src.id, src.name);
      } else {
        handler = new lambda.Function(this, `LambdaHandler-${index}`, {
          runtime: lambdaEntry.runtime,
          handler: 'index.handler',
          code: code,
        });
      }

      // Add resource and methods for this route
      const resource = this.addNestedResource(this.api.root, path);
      for (const method of methods) {
        resource.addMethod(
          method.method,
          new apiGateway.LambdaIntegration(handler),
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
