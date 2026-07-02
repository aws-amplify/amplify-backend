import { describe, it } from 'node:test';
import assert from 'node:assert';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AmplifyNotifications } from './construct.js';
import { DEFAULT_DOMAIN_NAME } from './constants.js';

const ISSUER = 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE';
const AUDIENCE = ['example-client-id'];

const synth = (
  props: Partial<{ domainName: string; expirationDays: number }> = {},
): { construct: AmplifyNotifications; template: Template } => {
  const stack = new Stack(new App());
  const construct = new AmplifyNotifications(stack, 'notifications', {
    jwtIssuer: ISSUER,
    jwtAudience: AUDIENCE,
    ...props,
  });
  return { construct, template: Template.fromStack(stack) };
};

void describe('AmplifyNotifications construct', () => {
  void it('provisions a Customer Profiles domain with identity-resolution auto-merge', () => {
    const { template } = synth();
    template.hasResourceProperties('AWS::CustomerProfiles::Domain', {
      DomainName: DEFAULT_DOMAIN_NAME,
      Matching: {
        Enabled: true,
        AutoMerging: {
          Enabled: true,
          ConflictResolution: { ConflictResolvingModel: 'RECENCY' },
          Consolidation: {
            MatchingAttributesList: [['Attributes.cognitoUserKey']],
          },
        },
      },
    });
  });

  void it('declares the AmplifyProfile and AmplifyDevice object types', () => {
    const { template } = synth();
    template.resourceCountIs('AWS::CustomerProfiles::ObjectType', 2);
    template.hasResourceProperties('AWS::CustomerProfiles::ObjectType', {
      ObjectTypeName: 'AmplifyProfile',
      AllowProfileCreation: true,
    });
    template.hasResourceProperties('AWS::CustomerProfiles::ObjectType', {
      ObjectTypeName: 'AmplifyDevice',
      AllowProfileCreation: true,
    });
  });

  void it('binds the JWT authorizer to the supplied issuer and audience', () => {
    const { template } = synth();
    template.hasResourceProperties('AWS::ApiGatewayV2::Authorizer', {
      AuthorizerType: 'JWT',
      IdentitySource: ['$request.header.Authorization'],
      JwtConfiguration: {
        Audience: AUDIENCE,
        Issuer: ISSUER,
      },
    });
  });

  void it('exposes the invoke endpoint and resource handles', () => {
    const { construct } = synth();
    assert.strictEqual(typeof construct.apiEndpoint, 'string');
    assert.strictEqual(construct.identifyUserPath, '/identify-user');
    assert.ok(construct.resources.identifyUserFunction);
    assert.ok(construct.resources.httpApi);
  });

  void it('honors a custom domain name and expiration', () => {
    const { construct, template } = synth({
      domainName: 'CustomDomain',
      expirationDays: 90,
    });
    assert.strictEqual(construct.domainName, 'CustomDomain');
    template.hasResourceProperties('AWS::CustomerProfiles::Domain', {
      DomainName: 'CustomDomain',
      DefaultExpirationDays: 90,
    });
  });
});
