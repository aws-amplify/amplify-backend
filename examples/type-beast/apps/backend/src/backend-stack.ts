import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AmplifyGraphqlApi } from '@aws-amplify/graphql-construct-alpha';
import { default as TBSchema } from '../data';
import { schemaPreprocessorWrapper } from './schemaProcessor';

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const apiName = 'TypedPOC';

    new AmplifyGraphqlApi(this, apiName, {
      apiName,
      schema: TBSchema,
      schemaPreprocessor: schemaPreprocessorWrapper,
      authorizationConfig: {
        defaultAuthMode: 'API_KEY',
        apiKeyConfig: {
          expires: cdk.Duration.days(30),
        },
      },
    });
  }
}
