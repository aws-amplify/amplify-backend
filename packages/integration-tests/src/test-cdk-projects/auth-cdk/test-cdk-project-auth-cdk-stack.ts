/* eslint-disable no-restricted-syntax */
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AmplifyAuth, AuthProps } from '@aws-amplify/auth-construct';

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
          domainPrefix: randomHex(20),
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

function randomHex(n: number) {
  const hex = '0123456789abcdef';
  const ret: string[] = [];
  for (let i = 0; i < n; i++) {
    ret.push(hex[Math.floor(Math.random() * hex.length)]);
  }
  return ret.join('');
}
