import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { App, NestedStack, Stack } from 'aws-cdk-lib';
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
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  ConstructContainer,
  ConstructFactoryGetInstanceProps,
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
  const authResources: ResourceProvider<AuthResources> = {
    resources: {
      userPool: sampleUserPool,
      userPoolClient: new UserPoolClient(stack, 'UserPoolClient', {
        userPool: sampleUserPool,
      }),
      unauthenticatedUserIamRole: new Role(stack, 'testUnauthRole', {
        assumedBy: new ServicePrincipal('test.amazon.com'),
      }),
      authenticatedUserIamRole: new Role(stack, 'testAuthRole', {
        assumedBy: new ServicePrincipal('test.amazon.com'),
      }),
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
  };
  constructContainer.registerConstructFactory('AuthResources', {
    provides: 'AuthResources',
    getInstance: (): ResourceProvider<AuthResources> => authResources,
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

  void it('attaches to an existing domain by default: no CfnDomain, object types on the existing domain, identify Lambda + JWT-authorized HTTP API', () => {
    const notifications = defineNotifications({
      domainName: EXISTING_DOMAIN,
    }).getInstance(getInstanceProps);
    const template = Template.fromStack(notifications.stack);

    template.resourceCountIs('AWS::CustomerProfiles::Domain', 0);
    template.resourceCountIs('AWS::CustomerProfiles::ObjectType', 2);
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
    template.resourceCountIs('AWS::ApiGatewayV2::Route', 1);

    assert.strictEqual(notifications.createdDomain, false);
    assert.strictEqual(notifications.domainName, EXISTING_DOMAIN);

    template.hasResourceProperties('AWS::CustomerProfiles::ObjectType', {
      ObjectTypeName: 'AmplifyProfile',
      DomainName: EXISTING_DOMAIN,
    });
    template.hasResourceProperties('AWS::CustomerProfiles::ObjectType', {
      ObjectTypeName: 'AmplifyDevice',
      DomainName: EXISTING_DOMAIN,
    });
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs20.x',
      Handler: 'index.handler',
    });
  });

  void it('provisions a new domain when createDomain is set', () => {
    const notifications = defineNotifications({
      createDomain: true,
      domainName: 'GreenfieldDomain',
    }).getInstance(getInstanceProps);
    const template = Template.fromStack(notifications.stack);

    template.resourceCountIs('AWS::CustomerProfiles::Domain', 1);
    template.resourceCountIs('AWS::CustomerProfiles::ObjectType', 2);
    assert.strictEqual(notifications.createdDomain, true);
  });

  void it('defaults the domain name to DEFAULT_DOMAIN_NAME when createDomain is set without a name', () => {
    const notifications = defineNotifications({
      createDomain: true,
    }).getInstance(getInstanceProps);
    const template = Template.fromStack(notifications.stack);

    template.resourceCountIs('AWS::CustomerProfiles::Domain', 1);
    assert.strictEqual(notifications.domainName, 'AmplifyIdentifyUserPoc');
  });

  void it('throws a helpful error when domainName is missing in attach mode', () => {
    assert.throws(
      () => defineNotifications().getInstance(getInstanceProps),
      /requires `domainName`/,
    );
  });

  void it('creates a Cognito JWT authorizer wired to the app user pool', () => {
    const notifications = defineNotifications({
      domainName: EXISTING_DOMAIN,
    }).getInstance(getInstanceProps);
    const template = Template.fromStack(notifications.stack);

    template.resourceCountIs('AWS::ApiGatewayV2::Authorizer', 1);
    template.hasResourceProperties('AWS::ApiGatewayV2::Authorizer', {
      AuthorizerType: 'JWT',
      IdentitySource: ['$request.header.Authorization'],
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
              'profile:ListProfileObjects',
              'profile:UpdateProfile',
            ],
          }),
        ]),
      }),
    });
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

  void it('does not provision push resources by default', () => {
    const notifications = defineNotifications({
      domainName: EXISTING_DOMAIN,
    }).getInstance(getInstanceProps);
    const template = Template.fromStack(notifications.stack);
    template.resourceCountIs('AWS::Pinpoint::App', 0);
    template.resourceCountIs('AWS::Lambda::Function', 1);
    assert.strictEqual(notifications.pushFunctionArn, undefined);
  });

  void it('provisions the push Lambda + Pinpoint app when push is enabled', () => {
    const notifications = defineNotifications({
      domainName: EXISTING_DOMAIN,
      push: true,
    }).getInstance(getInstanceProps);
    const template = Template.fromStack(notifications.stack);
    template.resourceCountIs('AWS::Pinpoint::App', 1);
    template.resourceCountIs('AWS::Lambda::Function', 2);
    assert.strictEqual(typeof notifications.pushFunctionArn, 'string');
    assert.ok(notifications.resources.pushFunction);
  });

  void it('adds a lambda:InvokeFunction resource policy for the Connect service principals when push is enabled', () => {
    const notifications = defineNotifications({
      domainName: EXISTING_DOMAIN,
      push: true,
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

  void it('reuses a supplied eumApplicationId (no Pinpoint app created)', () => {
    const notifications = defineNotifications({
      domainName: EXISTING_DOMAIN,
      push: true,
      eumApplicationId: 'byo-app-id',
    }).getInstance(getInstanceProps);
    const template = Template.fromStack(notifications.stack);
    template.resourceCountIs('AWS::Pinpoint::App', 0);
    assert.strictEqual(notifications.eumApplicationId, 'byo-app-id');
  });

  void it('surfaces the endpoint + region under a custom backend output', () => {
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
    assert.ok(parsed.custom.CustomerProfiles);
    assert.strictEqual(
      typeof parsed.custom.CustomerProfiles.endpoint,
      'string',
    );
    assert.strictEqual(typeof parsed.custom.CustomerProfiles.region, 'string');
  });

  void it('honors a custom output key', () => {
    defineNotifications({
      domainName: EXISTING_DOMAIN,
      outputKey: 'Notifications',
    }).getInstance(getInstanceProps);
    const [, entry] = addBackendOutputEntryMock.mock.calls[0].arguments as [
      string,
      BackendOutputEntry,
    ];
    const parsed = JSON.parse(
      (entry.payload as { customOutputs: string }).customOutputs,
    );
    assert.ok(parsed.custom.Notifications);
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
});
