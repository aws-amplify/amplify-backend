import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import {
  ExistingDirectory,
  ExistingLambda,
  NewFromCode,
  NewFromTemplate,
  RestApiConstructProps,
} from './types.js';

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

    let code: lambda.AssetCode | lambda.InlineCode = lambda.Code.fromInline('');
    const src = props.lambdaEntry.source;
    if ('path' in src) {
      const lamb = src as ExistingDirectory;
      code = lambda.Code.fromAsset(lamb.path);
    } else if ('code' in src) {
      const lamb = src as NewFromCode;
      code = lambda.Code.fromInline(lamb.code);
    } else if ('template' in src) {
      //TODO: Implement use of templates (which ones to support, and how - cli version is complex). The available templates depend on the runtime
      const lamb = src as NewFromTemplate;
      if (lamb.template === 'Hello World') {
        code = lambda.Code.fromInline(
          "function handler() {console.log('Hello World!');}",
        );
      }
    }

    let handler: lambda.IFunction;
    if ('id' in src) {
      const lamb = src as ExistingLambda;
      handler = lambda.Function.fromFunctionName(this, lamb.id, lamb.name);
    } else {
      handler = new lambda.Function(this, 'handler', {
        runtime: props.lambdaEntry.runtime,
        handler: 'index.handler',
        code: code,
      });
    }

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
