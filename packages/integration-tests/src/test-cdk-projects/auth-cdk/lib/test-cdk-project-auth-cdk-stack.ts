import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AmplifyAuth, AuthProps } from '@aws-amplify/auth-construct-alpha';
import * as process from 'process';

export class TestCdkProjectAuthCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    // Inject stack name from env to 1. know reference without lookup 2. ensure uniqueness.
    super(scope, process.env.TEST_STACK_NAME, props);
    const authProps: AuthProps = {
      loginWith: {
        email: true,
        phone: true,
        externalProviders: {
          loginWithAmazon: {
            clientId: '123',
            clientSecret: '123',
          },
          facebook: {
            clientId: '123',
            clientSecret: '123',
          },
        },
      },
      userAttributes: {
        email: { required: true },
      },
    };
    new AmplifyAuth(this, 'test-auth', authProps);
  }
}
