import { describe, it } from 'node:test';
import assert from 'node:assert';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import {
  AmplifyNotifications,
  AmplifyNotificationsProps,
} from './construct.js';

const ISSUER = 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE';
const AUDIENCE = ['example-client-id'];
/** An existing (e.g. Connect-managed) Customer Profiles domain to attach to. */
const EXISTING_DOMAIN = 'amazon-connect-amplify';

/** Attach-mode synth: registers object types INTO an existing domain. */
const synth = (
  props: Partial<
    Pick<
      AmplifyNotificationsProps,
      | 'domainName'
      | 'expirationDays'
      | 'instanceAlias'
      | 'apnsChannel'
      | 'fcmChannel'
    >
  > = {},
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

  void it('registers the AmplifyProfile + AmplifyGuestProfile + AmplifyDevice object types INTO the existing domain', () => {
    const { template } = synth();
    template.resourceCountIs('AWS::CustomerProfiles::ObjectType', 3);
    template.hasResourceProperties('AWS::CustomerProfiles::ObjectType', {
      ObjectTypeName: 'AmplifyProfile',
      DomainName: EXISTING_DOMAIN,
      AllowProfileCreation: true,
    });
    template.hasResourceProperties('AWS::CustomerProfiles::ObjectType', {
      ObjectTypeName: 'AmplifyGuestProfile',
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

  void it('grants profile:MergeProfiles on the enforced (undocumented) merge resource ARN', () => {
    const { template } = synth();
    // MergeProfiles authorizes against an undocumented
    // resource ARN of the shape .../domains/<domain>/profiles/objects/merge
    // (NOT the SAR-documented `domains` ARN). It lives in its own statement.
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: 'profile:MergeProfiles',
          }),
        ]),
      }),
    });
    const json = JSON.stringify(template.toJSON());
    assert.ok(
      json.includes(`/domains/${EXISTING_DOMAIN}/profiles/objects/merge`),
      'expected MergeProfiles to target the enforced merge resource ARN',
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
    assert.ok(construct.resources.guestProfileObjectType);
    assert.ok(construct.resources.deviceObjectType);
  });

  void it('adds an IAM-authorized GUEST route to the same Lambda with payload format 1.0', () => {
    const { construct, template } = synth();
    assert.strictEqual(construct.guestIdentifyUserPath, '/identify-user-guest');
    assert.strictEqual(typeof construct.guestRouteInvokeArn, 'string');
    // The guest route is authorized with AWS_IAM (SigV4), not JWT.
    template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
      RouteKey: 'POST /identify-user-guest',
      AuthorizationType: 'AWS_IAM',
    });
    // The authed route stays JWT-authorized.
    template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
      RouteKey: 'POST /identify-user',
      AuthorizationType: 'JWT',
    });
    // The guest integration MUST use payload format 1.0 so the Lambda receives
    // requestContext.identity.cognitoIdentityId (format 2.0 has no identity).
    template.hasResourceProperties('AWS::ApiGatewayV2::Integration', {
      PayloadFormatVersion: '1.0',
    });
    template.hasOutput('GuestIdentifyRouteInvokeArn', {});
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

void describe('AmplifyNotifications construct — optional push channels', () => {
  const APNS = {
    tokenKey: 'FAKE_P8_KEY_CONTENT_FOR_TESTING',
    keyId: 'ABC123DEFG',
    teamId: 'DEF456GHIJ',
    bundleId: 'com.example.app',
  };
  const FCM_JSON = '{"type":"service_account","project_id":"example"}';

  void it('configures NO channel when neither apns nor fcm is provided', () => {
    const { construct, template } = synth();
    template.resourceCountIs('AWS::Pinpoint::APNSChannel', 0);
    template.resourceCountIs('AWS::Pinpoint::APNSSandboxChannel', 0);
    template.resourceCountIs('AWS::Pinpoint::GCMChannel', 0);
    assert.strictEqual(construct.resources.apnsChannel, undefined);
    assert.strictEqual(construct.resources.gcmChannel, undefined);
  });

  void it('enables the APNs (production) channel with token auth when apnsChannel is provided', () => {
    const { construct, template } = synth({ apnsChannel: APNS });
    template.resourceCountIs('AWS::Pinpoint::APNSChannel', 1);
    template.resourceCountIs('AWS::Pinpoint::APNSSandboxChannel', 0);
    template.hasResourceProperties('AWS::Pinpoint::APNSChannel', {
      Enabled: true,
      DefaultAuthenticationMethod: 'TOKEN',
      TokenKey: APNS.tokenKey,
      TokenKeyId: APNS.keyId,
      TeamId: APNS.teamId,
      BundleId: APNS.bundleId,
      ApplicationId: Match.anyValue(),
    });
    assert.ok(construct.resources.apnsChannel);
  });

  void it('enables the APNs SANDBOX channel when apnsChannel.sandbox is true', () => {
    const { template } = synth({
      apnsChannel: { ...APNS, sandbox: true },
    });
    template.resourceCountIs('AWS::Pinpoint::APNSSandboxChannel', 1);
    template.resourceCountIs('AWS::Pinpoint::APNSChannel', 0);
    template.hasResourceProperties('AWS::Pinpoint::APNSSandboxChannel', {
      Enabled: true,
      DefaultAuthenticationMethod: 'TOKEN',
      TokenKey: APNS.tokenKey,
      TokenKeyId: APNS.keyId,
      TeamId: APNS.teamId,
      BundleId: APNS.bundleId,
    });
  });

  void it('enables the GCM/FCM channel with FCM HTTP v1 (TOKEN + ServiceJson) when fcmChannel is provided', () => {
    const { construct, template } = synth({
      fcmChannel: { serviceJson: FCM_JSON },
    });
    template.resourceCountIs('AWS::Pinpoint::GCMChannel', 1);
    template.hasResourceProperties('AWS::Pinpoint::GCMChannel', {
      Enabled: true,
      DefaultAuthenticationMethod: 'TOKEN',
      ServiceJson: FCM_JSON,
      ApplicationId: Match.anyValue(),
    });
    assert.ok(construct.resources.gcmChannel);
    // FCM v1 only: the legacy server-key path is not used.
    const json = JSON.stringify(template.toJSON());
    assert.ok(!json.includes('ApiKey'));
  });

  void it('enables BOTH channels when apns and fcm are provided together', () => {
    const { template } = synth({
      apnsChannel: APNS,
      fcmChannel: { serviceJson: FCM_JSON },
    });
    template.resourceCountIs('AWS::Pinpoint::APNSChannel', 1);
    template.resourceCountIs('AWS::Pinpoint::GCMChannel', 1);
  });

  void it('points the channels at the construct-created EUM application', () => {
    const { construct, template } = synth({
      apnsChannel: APNS,
      fcmChannel: { serviceJson: FCM_JSON },
    });
    // The channel ApplicationId is a Ref to the same Pinpoint app the push
    // Lambda targets — the channels attach to our own EUM app (logical id
    // derived from the `PushApp` construct id).
    template.hasResourceProperties('AWS::Pinpoint::APNSChannel', {
      ApplicationId: { Ref: Match.stringLikeRegexp('PushApp') },
    });
    template.hasResourceProperties('AWS::Pinpoint::GCMChannel', {
      ApplicationId: { Ref: Match.stringLikeRegexp('PushApp') },
    });
    assert.ok(construct.resources.apnsChannel);
    assert.ok(construct.resources.gcmChannel);
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

  void it('creates a CONNECT_MANAGED instance with inbound + outbound calls, high-volume outbound enabled, and a valid generated alias', () => {
    const { construct, template } = synthCreate();
    template.hasResourceProperties('AWS::Connect::Instance', {
      IdentityManagementType: 'CONNECT_MANAGED',
      Attributes: {
        InboundCalls: true,
        OutboundCalls: true,
        // Enables Outbound Campaigns on the instance, which makes Connect attach
        // the HighVolumeOutboundCommunicationAccess campaigns policy to the
        // instance service-linked role the console's Journey builder relies on.
        HighVolumeOutBound: true,
      },
      InstanceAlias: Match.stringLikeRegexp(
        'amazon-connect-notifications-[0-9a-f]+',
      ),
    });
    // The generated name is deterministic (stable across synths of the same
    // tree) so deploy and delete resolve the identical instance / domain.
    const { construct: again } = synthCreate();
    assert.strictEqual(construct.domainName, again.domainName);
  });

  void it('names the created domain with the same generated stable name (amazon-connect-* prefixed for Connect SLR access) and honors expiration', () => {
    const { construct, template } = synthCreate({ expirationDays: 90 });
    template.hasResourceProperties('AWS::CustomerProfiles::Domain', {
      DomainName: construct.domainName,
      DefaultExpirationDays: 90,
    });
    // The `amazon-connect-` prefix is REQUIRED: the Connect instance's
    // AWS-managed service-linked-role policy only grants profile:* on
    // domains/amazon-connect-*, so a differently-named domain is unreachable by
    // the instance (breaks the console CP feature + Journey segment builder).
    assert.match(
      construct.domainName,
      /^amazon-connect-notifications-[0-9a-f]+$/,
    );
    assert.ok(
      construct.domainName.startsWith('amazon-connect-'),
      'the created domain must be prefixed amazon-connect- for the Connect SLR to access it',
    );
  });

  void it('registers the object types INTO the created domain with an explicit dependency on it', () => {
    const { construct, template } = synthCreate();
    template.resourceCountIs('AWS::CustomerProfiles::ObjectType', 3);
    template.hasResourceProperties('AWS::CustomerProfiles::ObjectType', {
      ObjectTypeName: 'AmplifyProfile',
      DomainName: construct.domainName,
    });

    // All object types must DependsOn the created domain (in-construct ordering
    // — no cross-stack hack): the domain provisions first and is torn down last.
    // The created domain's logical id is derived from its construct id.
    for (const objectTypeName of [
      'AmplifyProfile',
      'AmplifyGuestProfile',
      'AmplifyDevice',
    ]) {
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
    // identify + push + campaign-association handler + the custom-resource
    // Provider framework Lambda.
    template.resourceCountIs('AWS::Lambda::Function', 4);
    template.resourceCountIs('AWS::Pinpoint::App', 1);
    template.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
  });

  void it('adds the Outbound Campaigns domain-association custom resource wired to a Provider', () => {
    const { template } = synthCreate();
    template.resourceCountIs('Custom::OutboundCampaignsDomainAssociation', 1);
    // The custom resource carries the instance id / domain / account / region the
    // handler needs, and depends on the created instance + domain.
    template.hasResourceProperties(
      'Custom::OutboundCampaignsDomainAssociation',
      Match.objectLike({ DomainName: Match.anyValue() }),
    );
    template.hasResource(
      'Custom::OutboundCampaignsDomainAssociation',
      Match.objectLike({
        DependsOn: Match.arrayWith([
          Match.stringLikeRegexp('ConnectInstance'),
          Match.stringLikeRegexp('ProfilesDomain'),
        ]),
      }),
    );
  });

  void it('grants the association Lambda least-privilege campaigns + profile + iam permissions', () => {
    const { template } = synthCreate();
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: [
              'connect-campaigns:StartInstanceOnboardingJob',
              'connect-campaigns:GetInstanceOnboardingJobStatus',
              'connect-campaigns:DeleteInstanceOnboardingJob',
              'connect-campaigns:PutConnectInstanceIntegration',
              'connect-campaigns:DeleteConnectInstanceIntegration',
            ],
          }),
          Match.objectLike({
            Effect: 'Allow',
            Action: 'connect:DescribeInstance',
          }),
          Match.objectLike({
            Effect: 'Allow',
            Action: [
              'profile:PutIntegration',
              'profile:DeleteIntegration',
              'profile:GetDomain',
            ],
          }),
          Match.objectLike({
            Effect: 'Allow',
            Action: 'iam:CreateServiceLinkedRole',
            Condition: {
              StringEquals: {
                'iam:AWSServiceName': 'connect-campaigns.amazonaws.com',
              },
            },
          }),
        ]),
      }),
    });
  });

  void it('does NOT add the campaign-association custom resource in attach mode', () => {
    const { template } = synth();
    template.resourceCountIs('Custom::OutboundCampaignsDomainAssociation', 0);
  });

  void it('binds the created domain to the instance as a CTR Customer Profiles integration (create mode)', () => {
    const { template } = synthCreate();
    // Native CFN resource (NOT the association custom resource): the
    // instance-level "Customer Profiles enabled" feature binding the Connect
    // console + Journey segment builder require.
    template.resourceCountIs('AWS::CustomerProfiles::Integration', 1);
    template.hasResourceProperties('AWS::CustomerProfiles::Integration', {
      ObjectTypeName: 'CTR',
      // Uri is the created Connect instance ARN (Fn::GetAtt on the instance).
      Uri: Match.objectLike({
        'Fn::GetAtt': Match.arrayWith([
          Match.stringLikeRegexp('ConnectInstance'),
        ]),
      }),
    });
    // Provisions after — and tears down before — the instance + domain.
    template.hasResource('AWS::CustomerProfiles::Integration', {
      DependsOn: Match.arrayWith([
        Match.stringLikeRegexp('ConnectInstance'),
        Match.stringLikeRegexp('ProfilesDomain'),
      ]),
    });
  });

  void it('does NOT add the CTR Customer Profiles integration in attach mode', () => {
    const { template } = synth();
    template.resourceCountIs('AWS::CustomerProfiles::Integration', 0);
  });

  void it('does NOT create any segment / campaign / journey resources (out of scope)', () => {
    const { template } = synthCreate();
    const json = template.toJSON() as { [key: string]: unknown };
    const resources = json['Resources'] as {
      [id: string]: { [key: string]: unknown };
    };
    const types = Object.values(resources).map((r) => String(r['Type']));
    for (const t of types) {
      // Match CFN campaign/segment/journey resource types (e.g.
      // AWS::Pinpoint::Campaign) — but NOT the `Custom::OutboundCampaigns...`
      // association custom resource, which creates no such CFN resource.
      assert.ok(
        !/::(Campaign|Segment|Journey)/i.test(t),
        `unexpected campaign/segment/journey resource: ${t}`,
      );
    }
  });
});
