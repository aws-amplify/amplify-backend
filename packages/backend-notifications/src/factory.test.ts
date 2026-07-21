import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { App, NestedStack, SecretValue, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import {
  CfnIdentityPool,
  CfnIdentityPoolRoleAttachment,
  CfnUserPool,
  CfnUserPoolClient,
  UserPool,
  UserPoolClient,
} from 'aws-cdk-lib/aws-cognito';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import {
  AuthResources,
  AuthRoleName,
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  BackendSecret,
  ConstructContainer,
  ConstructFactoryGetInstanceProps,
  ResourceAccessAcceptorFactory,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import {
  ConstructContainerStub,
  StackResolverStub,
} from '@aws-amplify/backend-platform-test-stubs';
import { customOutputKey } from '@aws-amplify/backend-output-schemas';
import { defineNotifications } from './factory.js';
import { AmplifyNotifications } from './construct.js';

/** An existing (e.g. Connect-managed) Customer Profiles domain to attach to. */
const EXISTING_DOMAIN = 'amazon-connect-amplify';

/**
 * A test double for an Amplify `secret()` (BackendSecret) whose resolved value
 * is a fixed plain text string, so a synth assertion can prove the resolved
 * secret was wired into the channel resource. Mirrors how the real
 * `backendSecretResolver` resolves a secret to a CFN token.
 */
const fakeSecret = (value: string): BackendSecret => ({
  resolve: () => SecretValue.unsafePlainText(value),
  resolvePath: () => ({
    branchSecretPath: `/amplify/branch/${value}`,
    sharedSecretPath: `/amplify/shared/${value}`,
  }),
});

const createStackAndSetContext = (): Stack => {
  const app = new App();
  app.node.setContext('amplify-backend-name', 'testEnvName');
  app.node.setContext('amplify-backend-namespace', 'testBackendId');
  app.node.setContext('amplify-backend-type', 'branch');
  return new Stack(app);
};

const registerAuth = (
  constructContainer: ConstructContainer,
  stack: Stack,
): void => {
  const sampleUserPool = new UserPool(stack, 'UserPool');
  const unauthenticatedUserIamRole = new Role(stack, 'testUnauthRole', {
    assumedBy: new ServicePrincipal('test.amazon.com'),
  });
  const authenticatedUserIamRole = new Role(stack, 'testAuthRole', {
    assumedBy: new ServicePrincipal('test.amazon.com'),
  });
  const roles: Record<string, Role> = {
    unauthenticatedUserIamRole,
    authenticatedUserIamRole,
  };
  const authResources: ResourceProvider<AuthResources> &
    ResourceAccessAcceptorFactory<AuthRoleName> = {
    resources: {
      userPool: sampleUserPool,
      userPoolClient: new UserPoolClient(stack, 'UserPoolClient', {
        userPool: sampleUserPool,
      }),
      unauthenticatedUserIamRole,
      authenticatedUserIamRole,
      cfnResources: {
        cfnUserPool: new CfnUserPool(stack, 'CfnUserPool', {}),
        cfnUserPoolClient: new CfnUserPoolClient(stack, 'CfnUserPoolClient', {
          userPoolId: 'userPool',
        }),
        cfnIdentityPool: new CfnIdentityPool(stack, 'identityPool', {
          allowUnauthenticatedIdentities: true,
        }),
        cfnIdentityPoolRoleAttachment: new CfnIdentityPoolRoleAttachment(
          stack,
          'identityPoolRoleAttachment',
          { identityPoolId: 'identityPool' },
        ),
      },
      groups: {},
      identityPoolId: 'identityPool',
    },
    // Mirrors the real auth factory: attach the grantor-owned policy to the
    // requested role (policy.attachToRole), never an inline policy on the role.
    getResourceAccessAcceptor: (roleIdentifier: AuthRoleName) => ({
      identifier: `${roleIdentifier}ResourceAccessAcceptor`,
      acceptResourceAccess: (policy) => {
        policy.attachToRole(roles[roleIdentifier]);
      },
    }),
  };
  constructContainer.registerConstructFactory('AuthResources', {
    provides: 'AuthResources',
    getInstance: (): ResourceProvider<AuthResources> &
      ResourceAccessAcceptorFactory<AuthRoleName> => authResources,
  });
};

void describe('defineNotifications', () => {
  let stack: Stack;
  let constructContainer: ConstructContainer;
  let outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
  let addBackendOutputEntryMock: ReturnType<typeof mock.fn>;
  let getInstanceProps: ConstructFactoryGetInstanceProps;

  beforeEach(() => {
    stack = createStackAndSetContext();
    constructContainer = new ConstructContainerStub(
      new StackResolverStub(stack),
    );
    registerAuth(constructContainer, stack);
    addBackendOutputEntryMock = mock.fn();
    outputStorageStrategy = {
      addBackendOutputEntry: addBackendOutputEntryMock,
      appendToBackendOutputList: mock.fn(),
    } as unknown as BackendOutputStorageStrategy<BackendOutputEntry>;
    getInstanceProps = {
      constructContainer,
      outputStorageStrategy,
    };
  });

  void it('returns a singleton instance', () => {
    const factory = defineNotifications({ domainName: EXISTING_DOMAIN });
    const first = factory.getInstance(getInstanceProps);
    const second = factory.getInstance(getInstanceProps);
    assert.strictEqual(first, second);
    assert.ok(first instanceof AmplifyNotifications);
  });

  void it('attaches to an existing domain: no CfnDomain, single AmplifyProfile object type, write + push Lambdas, SigV4 HTTP API', () => {
    const notifications = defineNotifications({
      domainName: EXISTING_DOMAIN,
    }).getInstance(getInstanceProps);
    const template = Template.fromStack(notifications.stack);

    template.resourceCountIs('AWS::CustomerProfiles::Domain', 0);
    template.resourceCountIs('AWS::CustomerProfiles::ObjectType', 1);
    // write Lambda + push Lambda (push is always provisioned).
    template.resourceCountIs('AWS::Lambda::Function', 2);
    template.resourceCountIs('AWS::Pinpoint::App', 1);
    template.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
    // Three SigV4 routes: /identify-user, /register-device, /remove-device.
    template.resourceCountIs('AWS::ApiGatewayV2::Route', 3);

    assert.strictEqual(notifications.domainName, EXISTING_DOMAIN);

    template.hasResourceProperties('AWS::CustomerProfiles::ObjectType', {
      ObjectTypeName: 'AmplifyProfile',
      DomainName: EXISTING_DOMAIN,
    });
    // Devices now live in DynamoDB, not Customer Profiles.
    template.resourceCountIs('AWS::DynamoDB::Table', 1);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs20.x',
      Handler: 'index.handler',
    });
  });

  void it('creates a Connect instance + Customer Profiles domain by default (no domainName)', () => {
    const notifications = defineNotifications().getInstance(getInstanceProps);
    const template = Template.fromStack(notifications.stack);

    template.resourceCountIs('AWS::Connect::Instance', 1);
    template.resourceCountIs('AWS::CustomerProfiles::Domain', 1);
    template.resourceCountIs('AWS::CustomerProfiles::ObjectType', 1);
    template.resourceCountIs('AWS::Lambda::Function', 4);
    template.resourceCountIs('Custom::OutboundCampaignsDomainAssociation', 1);
    // CTR feature binding: the created domain is registered to the instance.
    template.resourceCountIs('AWS::CustomerProfiles::Integration', 1);

    assert.strictEqual(notifications.createsResources, true);
    assert.match(
      notifications.domainName,
      /^amazon-connect-notifications-[0-9a-f]+$/,
    );
    template.hasResourceProperties('AWS::CustomerProfiles::ObjectType', {
      ObjectTypeName: 'AmplifyProfile',
      DomainName: notifications.domainName,
    });
    template.hasOutput('ConnectInstanceId', {});
    template.hasOutput('ProfilesDomainName', {});
  });

  void it('authorizes the write routes with SigV4 (no JWT authorizer)', () => {
    const notifications = defineNotifications({
      domainName: EXISTING_DOMAIN,
    }).getInstance(getInstanceProps);
    const template = Template.fromStack(notifications.stack);

    template.resourceCountIs('AWS::ApiGatewayV2::Authorizer', 0);
    template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
      RouteKey: 'POST /identify-user',
      AuthorizationType: 'AWS_IAM',
    });
  });

  void it('grants the Lambda least-privilege Customer Profiles access on the domain only', () => {
    const notifications = defineNotifications({
      domainName: EXISTING_DOMAIN,
    }).getInstance(getInstanceProps);
    const template = Template.fromStack(notifications.stack);

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: [
              'profile:PutProfileObject',
              'profile:SearchProfiles',
              'profile:UpdateProfile',
            ],
          }),
        ]),
      }),
    });
  });

  void it('grants the Identity Pool authenticated AND unauthenticated roles execute-api:Invoke on the write routes (in the notifications stack)', () => {
    const notifications = defineNotifications({
      domainName: EXISTING_DOMAIN,
    }).getInstance(getInstanceProps);
    const template = Template.fromStack(notifications.stack);

    // Exactly two execute-api:Invoke policies (one per Identity Pool role),
    // created in the NOTIFICATIONS (grantor) stack and attached to a role —
    // never an inline policy on the auth role's own stack (which would create a
    // circular nested-stack dep).
    const invokePolicies = template.findResources('AWS::IAM::Policy', {
      Properties: {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: 'execute-api:Invoke',
            }),
          ]),
        }),
        Roles: Match.anyValue(),
      },
    });
    assert.strictEqual(Object.keys(invokePolicies).length, 2);

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: 'execute-api:Invoke',
            // The grant is scoped to the concrete write-route invoke ARNs
            // (`$default/POST/<route>`), never a wildcard.
            Resource: Match.anyValue(),
          }),
        ]),
      }),
      Roles: Match.anyValue(),
    });
  });

  void it('grants the invoke policies only once across repeated getInstance calls', () => {
    const factory = defineNotifications({ domainName: EXISTING_DOMAIN });
    const notifications = factory.getInstance(getInstanceProps);
    factory.getInstance(getInstanceProps);
    const template = Template.fromStack(notifications.stack);
    const invokePolicies = template.findResources('AWS::IAM::Policy', {
      Properties: {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({ Action: 'execute-api:Invoke' }),
          ]),
        }),
      },
    });
    assert.strictEqual(Object.keys(invokePolicies).length, 2);
  });

  void it('respects a custom domainName (object types register into it)', () => {
    const notifications = defineNotifications({
      domainName: 'MyCustomDomain',
    }).getInstance(getInstanceProps);
    const template = Template.fromStack(notifications.stack);

    template.hasResourceProperties('AWS::CustomerProfiles::ObjectType', {
      ObjectTypeName: 'AmplifyProfile',
      DomainName: 'MyCustomDomain',
    });
    assert.strictEqual(notifications.domainName, 'MyCustomDomain');
  });

  void it('always provisions the push Lambda + Pinpoint app', () => {
    const notifications = defineNotifications({
      domainName: EXISTING_DOMAIN,
    }).getInstance(getInstanceProps);
    const template = Template.fromStack(notifications.stack);
    template.resourceCountIs('AWS::Pinpoint::App', 1);
    template.resourceCountIs('AWS::Lambda::Function', 2);
    assert.strictEqual(typeof notifications.pushFunctionArn, 'string');
    assert.ok(notifications.resources.pushFunction);
    assert.ok(notifications.resources.pushApplication);
  });

  void it('adds a lambda:InvokeFunction resource policy for the Connect service principals', () => {
    const notifications = defineNotifications({
      domainName: EXISTING_DOMAIN,
    }).getInstance(getInstanceProps);
    const template = Template.fromStack(notifications.stack);
    template.hasResourceProperties('AWS::Lambda::Permission', {
      Action: 'lambda:InvokeFunction',
      Principal: 'connect.amazonaws.com',
    });
    template.hasResourceProperties('AWS::Lambda::Permission', {
      Action: 'lambda:InvokeFunction',
      Principal: 'connect-campaigns.amazonaws.com',
    });
  });

  void it('surfaces the endpoint + region under notifications.amazon_connect', () => {
    defineNotifications({ domainName: EXISTING_DOMAIN }).getInstance(
      getInstanceProps,
    );

    assert.strictEqual(addBackendOutputEntryMock.mock.callCount(), 1);
    const [key, entry] = addBackendOutputEntryMock.mock.calls[0].arguments as [
      string,
      BackendOutputEntry,
    ];
    assert.strictEqual(key, customOutputKey);
    assert.strictEqual(entry.version, '1');
    const parsed = JSON.parse(
      (entry.payload as { customOutputs: string }).customOutputs,
    );
    // Lands in the canonical `notifications` section, NOT under `custom`.
    assert.strictEqual(parsed.custom, undefined);
    const profiles = parsed.notifications?.amazon_connect;
    assert.ok(profiles);
    assert.strictEqual(typeof profiles.endpoint, 'string');
    assert.strictEqual(typeof profiles.aws_region, 'string');
  });

  void it('writes the custom output only once across repeated getInstance calls', () => {
    const factory = defineNotifications({ domainName: EXISTING_DOMAIN });
    factory.getInstance(getInstanceProps);
    factory.getInstance(getInstanceProps);
    assert.strictEqual(addBackendOutputEntryMock.mock.callCount(), 1);
  });

  void it('lands the construct in a dedicated nested stack', () => {
    const notifications = defineNotifications({
      domainName: EXISTING_DOMAIN,
    }).getInstance(getInstanceProps);
    assert.ok(notifications.stack instanceof NestedStack);
  });

  void it('throws a helpful error when auth is not present in the backend', () => {
    const emptyContainer = new ConstructContainerStub(
      new StackResolverStub(createStackAndSetContext()),
    );
    assert.throws(
      () =>
        defineNotifications({ domainName: EXISTING_DOMAIN }).getInstance({
          constructContainer: emptyContainer,
          outputStorageStrategy,
        }),
      /requires an auth resource/,
    );
  });

  void it('configures NO push channels when apns/fcm are omitted', () => {
    const notifications = defineNotifications({
      domainName: EXISTING_DOMAIN,
    }).getInstance(getInstanceProps);
    const template = Template.fromStack(notifications.stack);
    template.resourceCountIs('AWS::Pinpoint::APNSChannel', 0);
    template.resourceCountIs('AWS::Pinpoint::APNSSandboxChannel', 0);
    template.resourceCountIs('AWS::Pinpoint::GCMChannel', 0);
  });

  void it('resolves the Amplify secret() and wires the APNs channel when apns is provided', () => {
    const notifications = defineNotifications({
      domainName: EXISTING_DOMAIN,
      apns: {
        tokenKey: fakeSecret('p8-key-material'),
        tokenKeyId: 'ABC123DEFG',
        teamId: 'DEF456GHIJ',
        bundleId: 'com.example.app',
      },
    }).getInstance(getInstanceProps);
    const template = Template.fromStack(notifications.stack);

    template.resourceCountIs('AWS::Pinpoint::APNSChannel', 1);
    template.hasResourceProperties('AWS::Pinpoint::APNSChannel', {
      Enabled: true,
      DefaultAuthenticationMethod: 'TOKEN',
      // The resolved secret value flows into the token key.
      TokenKey: 'p8-key-material',
      TokenKeyId: 'ABC123DEFG',
      TeamId: 'DEF456GHIJ',
      BundleId: 'com.example.app',
    });
  });

  void it('resolves the Amplify secret() and wires the FCM (HTTP v1) channel when fcm is provided', () => {
    const notifications = defineNotifications({
      domainName: EXISTING_DOMAIN,
      fcm: {
        serviceJson: fakeSecret('{"type":"service_account"}'),
      },
    }).getInstance(getInstanceProps);
    const template = Template.fromStack(notifications.stack);

    template.resourceCountIs('AWS::Pinpoint::GCMChannel', 1);
    template.hasResourceProperties('AWS::Pinpoint::GCMChannel', {
      Enabled: true,
      DefaultAuthenticationMethod: 'TOKEN',
      ServiceJson: '{"type":"service_account"}',
    });
  });

  void it('configures the APNs SANDBOX channel when apns.sandbox is true', () => {
    const notifications = defineNotifications({
      domainName: EXISTING_DOMAIN,
      apns: {
        tokenKey: fakeSecret('p8-key-material'),
        tokenKeyId: 'ABC123DEFG',
        teamId: 'DEF456GHIJ',
        bundleId: 'com.example.app',
        sandbox: true,
      },
    }).getInstance(getInstanceProps);
    const template = Template.fromStack(notifications.stack);
    template.resourceCountIs('AWS::Pinpoint::APNSSandboxChannel', 1);
    template.resourceCountIs('AWS::Pinpoint::APNSChannel', 0);
  });

  void it('resolves both secrets and wires APNs + FCM channels together', () => {
    const notifications = defineNotifications({
      domainName: EXISTING_DOMAIN,
      apns: {
        tokenKey: fakeSecret('p8-key-material'),
        tokenKeyId: 'ABC123DEFG',
        teamId: 'DEF456GHIJ',
        bundleId: 'com.example.app',
      },
      fcm: {
        serviceJson: fakeSecret('{"type":"service_account"}'),
      },
    }).getInstance(getInstanceProps);
    const template = Template.fromStack(notifications.stack);

    template.resourceCountIs('AWS::Pinpoint::APNSChannel', 1);
    template.resourceCountIs('AWS::Pinpoint::GCMChannel', 1);
    template.hasResourceProperties('AWS::Pinpoint::APNSChannel', {
      TokenKey: 'p8-key-material',
    });
    template.hasResourceProperties('AWS::Pinpoint::GCMChannel', {
      ServiceJson: '{"type":"service_account"}',
    });
  });
});
