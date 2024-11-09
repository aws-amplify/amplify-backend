import { CfnResource, Resource } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as crypto from 'crypto';
import { generateSqlSchema } from '../utils/parse-schema';

export interface AmplifyDatabaseSchemaProps {
  // List all the properties 
  ResourceArn: string;
  SecretArn: string;
  Schema: any;
  MigrationId?: string;
}
export class AmplifyDatabaseSchema extends CfnResource {
  constructor(scope: Construct, id: string, props: AmplifyDatabaseSchemaProps) {
    const sqlSchema = generateSqlSchema(props.Schema);
    super(scope, id, {
      type: 'AWS::Sundersc::SampleResource',
      properties: {
        ResourceArn: props.ResourceArn,
        SecretArn: props.SecretArn,
        NewSchema: JSON.stringify(sqlSchema),
        MigrationId: crypto.randomUUID(),
      }
    });
  }
}




// arn:aws:rds:us-east-1:663595804066:db/schemaconstructstack-amplifydatabaseamplifydatabas-tfnynjfdtwtj
// arn:aws:rds:us-east-1:663595804066:db:schemaconstructstack-amplifydatabaseamplifydatabas-tfnynjfdtwtj



// new AmplifyDatabaseSchema(this, schemaLogicalId, {
//   ResourceArn: 'arn:aws:rds:us-east-1:663595804066:cluster:aurora-pg-serverless',
//   SecretArn: 'arn:aws:secretsmanager:us-east-1:663595804066:secret:rds!cluster-8dc0f8c0-430e-44ab-bcf4-7d8e738e27f0-H8lbvU',
//   NewSchema: JSON.stringify(sqlSchema),
// });
