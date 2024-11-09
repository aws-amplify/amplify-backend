// lib/api-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import { generateSqlSchema } from '../utils/parse-schema';
import { LambdaIntegrationNoPremission } from './lambda-integration-no-permission';
import pluralize = require('pluralize');
import * as s3assets from 'aws-cdk-lib/aws-s3-assets';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface TableDefinition {
  tableName: string;
  columns: {
    name: string;
    type: string;
    primaryKey?: boolean;
  }[];
}

export class AmplifyRestApi extends Construct {
  /**
   * Reference to parent stack of database construct
   */
  public readonly stack: Stack;

  /**
   * Data source strategy for Amplify GraphQL API
   */
  // public readonly dataSourceStrategy: SQLLambdaModelDataSourceStrategy;

  constructor(scope: Construct, id: string, props: AmplifyRestApiProps) {
    super(scope, id);
    this.stack = Stack.of(scope);
    const sqlSchema = generateSqlSchema(props.Schema);
    
    const tableDefinitions: TableDefinition[] = sqlSchema.tables;

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'AmplifyRestApiGateway', {
      restApiName: 'Amplify REST API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS
      },
    });

    const PATH_TABLE_MAP: Record<string, string> = {};
    tableDefinitions.forEach(table => {
      PATH_TABLE_MAP[pluralize(table.tableName.toLowerCase())] = table.tableName;
    });

    const s3FileAsset = this.createAssetFromString(this, 'S3TableDefinitionsAsset', JSON.stringify(tableDefinitions), 'table-definitions.json');
    
    // Create Lambda function
    const handler = new lambdaNode.NodejsFunction(this, 'DatabaseRestApiHandler', {
      entry: path.join(__dirname, '../../src/rest-api-handler/handler.ts'),
      environment: {
        CLUSTER_ARN: props.ResourceArn,
        SECRET_ARN: props.SecretArn,
        DATABASE_NAME: 'postgres',
        // TABLE_DEFINITIONS: JSON.stringify(tableDefinitions),
        PATH_TABLE_MAP: JSON.stringify(PATH_TABLE_MAP),
        S3_TABLE_DEFINITIONS_BUCKET: s3FileAsset.s3BucketName,
        S3_TABLE_DEFINITIONS_KEY: s3FileAsset.s3ObjectKey,
      }
    });
    s3FileAsset.grantRead(handler);

    // Grant Data API permissions
    handler.addToRolePolicy(new iam.PolicyStatement({
      actions: ['rds-data:ExecuteStatement', 'secretsmanager:GetSecretValue'],
      resources: [props.ResourceArn, props.SecretArn]
    }));

    // Create API resources for each table
    tableDefinitions.forEach(table => {
      const resourceName = pluralize(table.tableName.toLowerCase());
      const resourcePath = api.root.addResource(resourceName);
      // const sharedIntegration = new apigateway.LambdaIntegration(handler);
      const sharedIntegration = new LambdaIntegrationNoPremission(handler);
      // Skip the automatic permission creation
      (sharedIntegration as any).permissionsBoundary = cdk.Token.asString('Skip');

      // GET /table
      resourcePath.addMethod('GET', sharedIntegration);
      
      // POST /table
      resourcePath.addMethod('POST', sharedIntegration);
      
      // GET /table/{id}
      const itemResource = resourcePath.addResource('{id}');
      itemResource.addMethod('GET', sharedIntegration);
      
      // PUT /table/{id}
      itemResource.addMethod('PUT', sharedIntegration);
      
      // DELETE /table/{id}
      itemResource.addMethod('DELETE', sharedIntegration);
    });

    // Manually add the permission you want
    [
      'GET',
      'POST',
      'GET/*',
      'PUT/*',
      'DELETE/*'
    ].forEach(path => {
      this.addMethodPermission(handler, api, path);
    });
    
    // handler.addPermission('ApiPermission', {
    //   principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    //   action: 'lambda:InvokeFunction',
    //   sourceArn: api.arnForExecuteApi('GET/*')
    // });
    
  }

  addMethodPermission = (handler: lambdaNode.NodejsFunction, api: cdk.aws_apigateway.RestApi, path: string) => {
    const permissionId = `ApiPermission.${path.replace(/\//g, '.').replace('*', 'All')}`;
    handler.addPermission(`ApiPermission${permissionId}`, {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: api.arnForExecuteApi(path)
    });
  }

  private createAssetFromString(
    scope: Construct,
    id: string, 
    content: string, 
    filename: string
  ): s3assets.Asset {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdk-assets-'));
    const filePath = path.join(tempDir, filename);
    
    try {
      fs.writeFileSync(filePath, content);
      return new s3assets.Asset(scope, id, {
        path: filePath
      });
    } finally {
      // Schedule cleanup for after asset is created
      process.nextTick(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
      });
    }
  }
}

/**
 * Input props for the AmplifyDatabase construct.
 */
export interface AmplifyRestApiProps {
  // List all the properties 
  ResourceArn: string;
  SecretArn: string;
  Schema: any;
}
