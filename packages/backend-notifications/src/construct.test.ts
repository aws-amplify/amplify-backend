import { describe, it } from 'node:test';
import assert from 'node:assert';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AmplifyNotifications } from './construct.js';

const ISSUER = 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE';
const AUDIENCE = ['example-client-id'];
/** An existing (e.g. Connect-managed) Customer Profiles domain to attach to. */
const EXISTING_DOMAIN = 'amazon-connect-amplify';

/** Attach-mode synth: registers object types INTO an existing domain. */
const synth = (
  props: Partial<{
    domainName: string;
    expirationDays: number;
    instanceAlias: string;
  }> = {},
): { construct: AmplifyNotifications; template: Template } => {
  const stack = new Stack(new App());
  const construct = new AmplifyNotifications(stack, 'notifications', {
    jwtIssuer: ISSUER,
    jwtAudience: AUDIENCE,
    domainName: EXISTING_DOMAIN,
    ...props,
  });
  return { construct, template: Template.fromStack(stack) };
};

/**
 * Create-from-scratch synth: NO domainName, so the construct provisions a new
 * Connect instance + Customer Profiles domain and wires everything into it.
 */
const synthCreate = (
  props: Partial<{
    expirationDays: number;
    instanceAlias: string;
  }> = {},
): { construct: AmplifyNotifications; template: Template } => {
  const stack = new Stack(new App());
  const construct = new AmplifyNotifications(stack, 'notifications', {
    jwtIssuer: ISSUER,
    jwtAudience: AUDIENCE,
    ...props,
  });
  return { construct, template: Template.fromStack(stack) };
};

void describe('AmplifyNotifications construct — domain attach', () => {
  void it('does NOT create a Customer Profiles domain (attaches to the existing one)', () => {
    const { construct, template } = synth();
    template.resourceCountIs('AWS::CustomerProfiles::Domain', 0);
    assert.strictEqual(construct.domainName, EXISTING_DOMAIN);
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

  void it('honors a custom expiration on the object types', () => {
    const { template } = synth({ expirationDays: 90 });
    template.hasResourceProperties('AWS::CustomerProfiles::ObjectType', {
      ObjectTypeName: 'AmplifyProfile',
      ExpirationDays: 90,
    });
  });

  void it('does not create a Connect instance in attach mode', () => {
    const { construct, template } = synth();
    template.resourceCountIs('AWS::Connect::Instance', 0);
    assert.strictEqual(construct.createsResources, false);
    assert.strictEqual(construct.connectInstanceId, undefined);
    assert.strictEqual(construct.connectInstanceArn, undefined);
    assert.strictEqual(construct.resources.connectInstance, undefined);
    assert.strictEqual(construct.resources.profilesDomain, undefined);
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

void describe('AmplifyNotifications construct — push path (always provisioned)', () => {
  void it('always provisions a Pinpoint app + push Lambda', () => {
    const { construct, template } = synth();
    template.resourceCountIs('AWS::Pinpoint::App', 1);
    // identify Lambda + push Lambda.
    template.resourceCountIs('AWS::Lambda::Function', 2);
    assert.ok(construct.resources.pushFunction);
    assert.ok(construct.resources.pushApplication);
    assert.strictEqual(typeof construct.pushFunctionArn, 'string');
    assert.strictEqual(typeof construct.eumApplicationId, 'string');
    template.hasOutput('PushHandlerFunctionArn', {});
  });

  void it('names the Pinpoint app after the domain', () => {
    const { template } = synth();
    template.hasResourceProperties('AWS::Pinpoint::App', {
      Name: `${EXISTING_DOMAIN}-push`,
    });
  });

  void it('grants the push Lambda least-privilege profile + SendMessages permissions scoped to the existing domain', () => {
    const { template } = synth();
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
    const { template } = synth();
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
    const { template } = synth();
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          PROFILES_DOMAIN_NAME: EXISTING_DOMAIN,
          EUM_APPLICATION_ID: Match.anyValue(),
        }),
      },
    });
  });
});

void describe('AmplifyNotifications construct — create-from-scratch (default)', () => {
  void it('creates a Connect instance AND a Customer Profiles domain when domainName is omitted', () => {
    const { construct, template } = synthCreate();
    template.resourceCountIs('AWS::Connect::Instance', 1);
    template.resourceCountIs('AWS::CustomerProfiles::Domain', 1);
    assert.strictEqual(construct.createsResources, true);
    assert.ok(construct.resources.connectInstance);
    assert.ok(construct.resources.profilesDomain);
    assert.strictEqual(typeof construct.connectInstanceId, 'string');
    assert.strictEqual(typeof construct.connectInstanceArn, 'string');
  });

  void it('creates a CONNECT_MANAGED instance with inbound + outbound calls and a valid generated alias', () => {
    const { construct, template } = synthCreate();
    template.hasResourceProperties('AWS::Connect::Instance', {
      IdentityManagementType: 'CONNECT_MANAGED',
      Attributes: {
        InboundCalls: true,
        OutboundCalls: true,
      },
      InstanceAlias: Match.stringLikeRegexp('amplify-notifications-[0-9a-f]+'),
    });
    // The generated name is deterministic (stable across synths of the same
    // tree) so deploy and delete resolve the identical instance / domain.
    const { construct: again } = synthCreate();
    assert.strictEqual(construct.domainName, again.domainName);
  });

  void it('names the created domain with the same generated stable name and honors expiration', () => {
    const { construct, template } = synthCreate({ expirationDays: 90 });
    template.hasResourceProperties('AWS::CustomerProfiles::Domain', {
      DomainName: construct.domainName,
      DefaultExpirationDays: 90,
    });
    assert.match(construct.domainName, /^amplify-notifications-[0-9a-f]+$/);
  });

  void it('registers the object types INTO the created domain with an explicit dependency on it', () => {
    const { construct, template } = synthCreate();
    template.resourceCountIs('AWS::CustomerProfiles::ObjectType', 2);
    template.hasResourceProperties('AWS::CustomerProfiles::ObjectType', {
      ObjectTypeName: 'AmplifyProfile',
      DomainName: construct.domainName,
    });

    // Both object types must DependsOn the created domain (in-construct ordering
    // — no cross-stack hack): the domain provisions first and is torn down last.
    // The created domain's logical id is derived from its construct id.
    for (const objectTypeName of ['AmplifyProfile', 'AmplifyDevice']) {
      template.hasResource('AWS::CustomerProfiles::ObjectType', {
        Properties: Match.objectLike({ ObjectTypeName: objectTypeName }),
        DependsOn: Match.arrayWith([Match.stringLikeRegexp('ProfilesDomain')]),
      });
    }
  });

  void it('allows overriding the instance alias', () => {
    const { template } = synthCreate({ instanceAlias: 'My_Custom Alias!' });
    // Sanitized to lowercase letters/digits + single hyphens, no invalid chars.
    template.hasResourceProperties('AWS::Connect::Instance', {
      InstanceAlias: 'my-custom-alias',
    });
  });

  void it('exposes create-mode outputs (instance id/arn, domain name)', () => {
    const { template } = synthCreate();
    template.hasOutput('ConnectInstanceId', {});
    template.hasOutput('ConnectInstanceArn', {});
    template.hasOutput('ProfilesDomainName', {});
  });

  void it('still provisions identify + push Lambdas, HTTP API and Pinpoint app in create mode', () => {
    const { template } = synthCreate();
    template.resourceCountIs('AWS::Lambda::Function', 2);
    template.resourceCountIs('AWS::Pinpoint::App', 1);
    template.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
  });

  void it('does NOT create any segment / campaign / journey resources (out of scope)', () => {
    const { template } = synthCreate();
    const json = template.toJSON() as { [key: string]: unknown };
    const resources = json['Resources'] as {
      [id: string]: { [key: string]: unknown };
    };
    const types = Object.values(resources).map((r) => String(r['Type']));
    for (const t of types) {
      assert.ok(
        !/Campaign|Segment|Journey/i.test(t),
        `unexpected campaign/segment/journey resource: ${t}`,
      );
    }
  });
});
