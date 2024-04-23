import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AmplifyAuth, AuthProps } from '@aws-amplify/auth-construct-alpha';
import { randomBytes } from 'node:crypto';

export class TestCdkProjectAuthCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    // Inject stack name from cdk context to 1. know reference without lookup 2. ensure uniqueness.
    super(scope, scope.node.getContext('test-stack-name'), props);
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
          domainPrefix: randomBytes(10).toString('hex'),
          logoutUrls: ['https://logout.com'],
          callbackUrls: ['https://redirect.com'],
        },
      },
      userAttributes: {
        email: { required: true },
      },
    };
    new AmplifyAuth(this, 'test-auth', authProps);
  }
}
