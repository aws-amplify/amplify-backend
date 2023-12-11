import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AmplifyAuth, AuthProps } from '@aws-amplify/auth-construct-alpha';

export class TestCdkProjectAuthCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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
    new AmplifyAuth(scope, 'test-auth', authProps);
  }
}
