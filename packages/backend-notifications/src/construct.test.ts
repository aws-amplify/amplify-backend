import { describe, it } from 'node:test';
import assert from 'node:assert';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AmplifyNotifications } from './construct.js';

const ISSUER = 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE';
const AUDIENCE = ['example-client-id'];
/** An existing (e.g. Connect-managed) Customer Profiles domain to attach to. */
const EXISTING_DOMAIN = 'amazon-connect-amplify';

const synth = (
  props: Partial<{
    domainName: string;
    createDomain: boolean;
    expirationDays: number;
    push: boolean;
    eumApplicationId: string;
  }> = {},
): { construct: AmplifyNotifications; template: Template } => {
  const stack = new Stack(new App());
  const construct = new AmplifyNotifications(stack, 'notifications', {
    jwtIssuer: ISSUER,
    jwtAudience: AUDIENCE,
    // Default the tests to attach mode against an existing domain.
    domainName: EXISTING_DOMAIN,
    ...props,
  });
  return { construct, template: Template.fromStack(stack) };
};

void describe('AmplifyNotifications construct — attach mode (default)', () => {
  void it('does NOT create a Customer Profiles domain (attaches to the existing one)', () => {
    const { construct, template } = synth();
    template.resourceCountIs('AWS::CustomerProfiles::Domain', 0);
    assert.strictEqual(construct.createdDomain, false);
    assert.strictEqual(construct.domainName, EXISTING_DOMAIN);
    assert.strictEqual(construct.resources.domain, undefined);
  });

  void it('registers the AmplifyProfile + AmplifyDevice object types INTO the existing domain', () => {
    const { template } = synth();
    template.resourceCountIs('AWS::CustomerProfiles::ObjectType', 2);
    template.hasResourceProperties('AWS::CustomerProfiles::ObjectType', {
      ObjectTypeName: 'AmplifyProfile',
      DomainName: EXISTING_DOMAIN,
      AllowProfileCreation: true,
    });
    template.hasResourceProperties('AWS::CustomerProfiles::ObjectType', {
      ObjectTypeName: 'AmplifyDevice',
      DomainName: EXISTING_DOMAIN,
      AllowProfileCreation: true,
    });
  });

  void it('requires a domainName in attach mode', () => {
    assert.throws(
      () =>
        new AmplifyNotifications(new Stack(new App()), 'notifications', {
          jwtIssuer: ISSUER,
          jwtAudience: AUDIENCE,
        }),
      /`domainName` is required in the default attach mode/,
    );
  });

  void it('scopes the identify Lambda profile:* permissions to the existing domain + its object types', () => {
    const { template } = synth();
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: [
              'profile:PutProfileObject',
              'profile:SearchProfiles',
              'profile:ListProfileObjects',
              'profile:UpdateProfile',
            ],
          }),
        ]),
      }),
    });
    // The Resource ARNs are scoped to THIS domain (and its object-types), never
    // a domains/* wildcard. ARNs synth as Fn::Join arrays whose literal tail is
    // the domain-scoped resource path.
    const json = JSON.stringify(template.toJSON());
    assert.ok(
      json.includes(`:domains/${EXISTING_DOMAIN}`),
      'expected the identify policy to reference the existing domain ARN',
    );
    assert.ok(
      json.includes(`:domains/${EXISTING_DOMAIN}/object-types/*`),
      'expected the identify policy to reference the domain object-types ARN',
    );
    assert.ok(
      !json.includes(':domains/*'),
      'the policy must not use a domains/* wildcard',
    );
  });
});

void describe('AmplifyNotifications construct — create mode (opt-in)', () => {
  void it('provisions a Customer Profiles domain with identity-resolution auto-merge', () => {
    const { construct, template } = synth({
      createDomain: true,
      domainName: 'GreenfieldDomain',
    });
    assert.strictEqual(construct.createdDomain, true);
    assert.ok(construct.resources.domain);
    template.resourceCountIs('AWS::CustomerProfiles::Domain', 1);
    template.hasResourceProperties('AWS::CustomerProfiles::Domain', {
      DomainName: 'GreenfieldDomain',
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

  void it('still declares the two object types on the created domain', () => {
    const { template } = synth({
      createDomain: true,
      domainName: 'GreenfieldDomain',
    });
    template.resourceCountIs('AWS::CustomerProfiles::ObjectType', 2);
    template.hasResourceProperties('AWS::CustomerProfiles::ObjectType', {
      ObjectTypeName: 'AmplifyProfile',
      DomainName: 'GreenfieldDomain',
    });
  });

  void it('defaults the domain name when createDomain is set without a name', () => {
    const stack = new Stack(new App());
    const construct = new AmplifyNotifications(stack, 'notifications', {
      jwtIssuer: ISSUER,
      jwtAudience: AUDIENCE,
      createDomain: true,
    });
    assert.strictEqual(construct.domainName, 'AmplifyIdentifyUserPoc');
  });

  void it('honors a custom expiration', () => {
    const { template } = synth({
      createDomain: true,
      domainName: 'CustomDomain',
      expirationDays: 90,
    });
    template.hasResourceProperties('AWS::CustomerProfiles::Domain', {
      DomainName: 'CustomDomain',
      DefaultExpirationDays: 90,
    });
  });
});

void describe('AmplifyNotifications construct — HTTP API', () => {
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
    assert.ok(construct.resources.profileObjectType);
    assert.ok(construct.resources.deviceObjectType);
  });
});

void describe('AmplifyNotifications construct — push path', () => {
  void it('does NOT provision push resources by default (identify path unchanged)', () => {
    const { construct, template } = synth();
    template.resourceCountIs('AWS::Pinpoint::App', 0);
    template.resourceCountIs('AWS::Lambda::Function', 1);
    assert.strictEqual(construct.pushFunctionArn, undefined);
    assert.strictEqual(construct.eumApplicationId, undefined);
    assert.strictEqual(construct.resources.pushFunction, undefined);
  });

  void it('provisions a Pinpoint app + push Lambda when push is enabled', () => {
    const { construct, template } = synth({ push: true });
    template.resourceCountIs('AWS::Pinpoint::App', 1);
    // identify Lambda + push Lambda.
    template.resourceCountIs('AWS::Lambda::Function', 2);
    assert.ok(construct.resources.pushFunction);
    assert.ok(construct.resources.pushApplication);
    assert.strictEqual(typeof construct.pushFunctionArn, 'string');
    template.hasOutput('PushHandlerFunctionArn', {});
  });

  void it('reuses a supplied eumApplicationId instead of creating a Pinpoint app', () => {
    const { construct, template } = synth({
      push: true,
      eumApplicationId: 'existing-app-id',
    });
    template.resourceCountIs('AWS::Pinpoint::App', 0);
    template.resourceCountIs('AWS::Lambda::Function', 2);
    assert.strictEqual(construct.eumApplicationId, 'existing-app-id');
    assert.strictEqual(construct.resources.pushApplication, undefined);
  });

  void it('grants the push Lambda least-privilege profile + SendMessages permissions scoped to the existing domain', () => {
    const { template } = synth({ push: true });
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: [
              'profile:ListProfileObjects',
              'profile:DeleteProfileObject',
            ],
          }),
          Match.objectLike({
            Effect: 'Allow',
            Action: 'mobiletargeting:SendMessages',
          }),
        ]),
      }),
    });
    const json = JSON.stringify(template.toJSON());
    assert.ok(json.includes(`:domains/${EXISTING_DOMAIN}/object-types/*`));
    assert.ok(!json.includes(':domains/*'));
  });

  void it('adds a lambda:InvokeFunction resource policy for the Connect service principals, scoped to this account', () => {
    const { template } = synth({ push: true });
    template.hasResourceProperties('AWS::Lambda::Permission', {
      Action: 'lambda:InvokeFunction',
      Principal: 'connect.amazonaws.com',
      SourceAccount: Match.anyValue(),
    });
    template.hasResourceProperties('AWS::Lambda::Permission', {
      Action: 'lambda:InvokeFunction',
      Principal: 'connect-campaigns.amazonaws.com',
      SourceAccount: Match.anyValue(),
    });
  });

  void it('sets the domain + EUM app id env vars on the push Lambda', () => {
    const { template } = synth({ push: true, eumApplicationId: 'app-xyz' });
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          PROFILES_DOMAIN_NAME: EXISTING_DOMAIN,
          EUM_APPLICATION_ID: 'app-xyz',
        }),
      },
    });
  });
});
