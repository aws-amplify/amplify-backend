import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { roleAccessBuilder } from './access_builder.js';
import {
  ConstructContainer,
  ConstructFactoryGetInstanceProps,
  ResourceAccessAcceptor,
  ResourceAccessAcceptorFactory,
  ResourceProvider,
  SsmEnvironmentEntry,
} from '@aws-amplify/plugin-types';
import { App, Stack } from 'aws-cdk-lib';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';

void describe('storageAccessBuilder', () => {
  const resourceAccessAcceptorMock = mock.fn();
  const group1AccessAcceptorMock = mock.fn();
  const group2AccessAcceptorMock = mock.fn();

  const getResourceAccessAcceptorMock = mock.fn((roleName: string) => {
    switch (roleName) {
      case 'group1Name':
        return group1AccessAcceptorMock;
      case 'group2Name':
        return group2AccessAcceptorMock;
      default:
        return resourceAccessAcceptorMock;
    }
  });

  const getConstructFactoryMock = mock.fn(
    // this lets us get proper typing on the mock args
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    <T extends ResourceProvider>(_: string) => ({
      getInstance: () =>
        ({
          getResourceAccessAcceptor: getResourceAccessAcceptorMock,
        }) as unknown as T,
    }),
  );
  const stubGetInstanceProps: ConstructFactoryGetInstanceProps = {
    constructContainer: {
      getConstructFactory: getConstructFactoryMock,
    } as unknown as ConstructContainer,
  } as unknown as ConstructFactoryGetInstanceProps;

  beforeEach(() => {
    getResourceAccessAcceptorMock.mock.resetCalls();
    getConstructFactoryMock.mock.resetCalls();
    resourceAccessAcceptorMock.mock.resetCalls();
  });

  void it('builds storage access definition for authenticated role', () => {
    const accessDefinition = roleAccessBuilder.authenticated.to([
      'read',
      'write',
      'delete',
    ]);
    assert.deepStrictEqual(accessDefinition.actions, [
      'read',
      'write',
      'delete',
    ]);
    assert.equal(accessDefinition.idSubstitution, '*');
    assert.deepStrictEqual(
      accessDefinition.getResourceAccessAcceptors.map(
        (getResourceAccessAcceptor) =>
          getResourceAccessAcceptor(stubGetInstanceProps),
      ),
      [resourceAccessAcceptorMock],
    );
    assert.equal(
      getConstructFactoryMock.mock.calls[0].arguments[0],
      'AuthResources',
    );
    assert.equal(
      getResourceAccessAcceptorMock.mock.calls[0].arguments[0],
      'authenticatedUserIamRole',
    );
  });
  void it('builds storage access definition for guest role', () => {
    const accessDefinition = roleAccessBuilder.guest.to([
      'read',
      'write',
      'delete',
    ]);
    assert.deepStrictEqual(accessDefinition.actions, [
      'read',
      'write',
      'delete',
    ]);
    assert.equal(accessDefinition.idSubstitution, '*');
    assert.deepStrictEqual(
      accessDefinition.getResourceAccessAcceptors.map(
        (getResourceAccessAcceptor) =>
          getResourceAccessAcceptor(stubGetInstanceProps),
      ),
      [resourceAccessAcceptorMock],
    );
    assert.equal(
      getConstructFactoryMock.mock.calls[0].arguments[0],
      'AuthResources',
    );
    assert.equal(
      getResourceAccessAcceptorMock.mock.calls[0].arguments[0],
      'unauthenticatedUserIamRole',
    );
  });
  void it('builds storage access definition for IdP identity', () => {
    const accessDefinition = roleAccessBuilder
      .entity('identity')
      .to(['read', 'write', 'delete']);
    assert.deepStrictEqual(accessDefinition.actions, [
      'read',
      'write',
      'delete',
    ]);
    assert.equal(
      accessDefinition.idSubstitution,
      '${cognito-identity.amazonaws.com:sub}',
    );

    // Should have 2 resource access acceptors now: authenticated role + compound group acceptor
    assert.equal(accessDefinition.getResourceAccessAcceptors.length, 2);

    // First acceptor should be the authenticated role
    const authAcceptor =
      accessDefinition.getResourceAccessAcceptors[0](stubGetInstanceProps);
    assert.equal(authAcceptor, resourceAccessAcceptorMock);

    // Second acceptor should be the compound group acceptor
    const groupAcceptor =
      accessDefinition.getResourceAccessAcceptors[1](stubGetInstanceProps);
    assert.equal(typeof groupAcceptor.identifier, 'string');
    assert.equal(typeof groupAcceptor.acceptResourceAccess, 'function');

    assert.equal(
      getConstructFactoryMock.mock.calls[0].arguments[0],
      'AuthResources',
    );
    assert.equal(
      getResourceAccessAcceptorMock.mock.calls[0].arguments[0],
      'authenticatedUserIamRole',
    );
  });

  void it('builds storage access definition for resources', () => {
    const accessDefinition = roleAccessBuilder
      .resource({
        getInstance: () =>
          ({
            getResourceAccessAcceptor: getResourceAccessAcceptorMock,
          }) as unknown as ResourceProvider & ResourceAccessAcceptorFactory,
      })
      .to(['read', 'write', 'delete']);

    assert.deepStrictEqual(accessDefinition.actions, [
      'read',
      'write',
      'delete',
    ]);
    assert.equal(accessDefinition.idSubstitution, '*');
    assert.deepStrictEqual(
      accessDefinition.getResourceAccessAcceptors.map(
        (getResourceAccessAcceptor) =>
          getResourceAccessAcceptor(stubGetInstanceProps),
      ),
      [resourceAccessAcceptorMock],
    );
  });

  void it('builds storage access definition for multiple user pool groups', () => {
    const accessDefinition = roleAccessBuilder
      .groups(['group1Name', 'group2Name'])
      .to(['read', 'write']);

    assert.deepStrictEqual(accessDefinition.actions, ['read', 'write']);
    assert.equal(accessDefinition.idSubstitution, '*');
    assert.deepStrictEqual(
      accessDefinition.getResourceAccessAcceptors.map(
        (getResourceAccessAcceptor) =>
          getResourceAccessAcceptor(stubGetInstanceProps),
      ),
      [group1AccessAcceptorMock, group2AccessAcceptorMock],
    );
  });

  void it('entity permissions apply to all group roles when groups are defined', () => {
    // Mock acceptResourceAccess calls to verify they're made
    const adminAcceptResourceAccessMock = mock.fn();
    const usersAcceptResourceAccessMock = mock.fn();
    const adminAcceptorMock: ResourceAccessAcceptor = {
      identifier: 'adminAcceptor',
      acceptResourceAccess: adminAcceptResourceAccessMock,
    };
    const usersAcceptorMock: ResourceAccessAcceptor = {
      identifier: 'usersAcceptor',
      acceptResourceAccess: usersAcceptResourceAccessMock,
    };

    // Create a group-specific mock that returns the correct types
    const groupSpecificMock = mock.fn((roleName: string) => {
      if (roleName === 'Admins') return adminAcceptorMock;
      if (roleName === 'Users') return usersAcceptorMock;
      return resourceAccessAcceptorMock;
    });

    // Mock auth resources with groups
    const mockAuthResources = {
      resources: {
        groups: {
          Admins: { role: {} },
          Users: { role: {} },
        },
      },
      getResourceAccessAcceptor: groupSpecificMock,
    };

    const mockConstructFactory = mock.fn(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      <T extends ResourceProvider>(_: string) => ({
        getInstance: () => mockAuthResources as unknown as T,
      }),
    );

    const mockGetInstanceProps: ConstructFactoryGetInstanceProps = {
      constructContainer: {
        getConstructFactory: mockConstructFactory,
      } as unknown as ConstructContainer,
    } as unknown as ConstructFactoryGetInstanceProps;

    const accessDefinition = roleAccessBuilder
      .entity('identity')
      .to(['read', 'write', 'delete']);

    // Should have 2 resource access acceptors: authenticated role + compound group acceptor
    assert.equal(accessDefinition.getResourceAccessAcceptors.length, 2);

    // Get the compound group acceptor
    const groupAcceptor =
      accessDefinition.getResourceAccessAcceptors[1](mockGetInstanceProps);

    // Verify it has the expected structure
    assert.ok(groupAcceptor.identifier.includes('entityAccessForAllGroups'));
    assert.ok(groupAcceptor.identifier.includes('Admins'));
    assert.ok(groupAcceptor.identifier.includes('Users'));
    assert.equal(typeof groupAcceptor.acceptResourceAccess, 'function');

    // Call acceptResourceAccess on the compound acceptor
    const stack = new Stack(new App(), 'TestStack');
    const mockPolicy = new Policy(stack, 'TestPolicy', {
      statements: [new PolicyStatement()],
    });
    const mockSsmEntries: SsmEnvironmentEntry[] = [];
    groupAcceptor.acceptResourceAccess(mockPolicy, mockSsmEntries);

    // Verify both group roles had the policy applied
    assert.equal(adminAcceptResourceAccessMock.mock.callCount(), 1);
    assert.equal(usersAcceptResourceAccessMock.mock.callCount(), 1);
    assert.deepStrictEqual(
      adminAcceptResourceAccessMock.mock.calls[0].arguments,
      [mockPolicy, mockSsmEntries],
    );
    assert.deepStrictEqual(
      usersAcceptResourceAccessMock.mock.calls[0].arguments,
      [mockPolicy, mockSsmEntries],
    );
  });

  void it('entity permissions handle case when no groups are defined', () => {
    // Mock auth resources without groups
    const mockAuthResources = {
      resources: {
        groups: undefined,
      },
      getResourceAccessAcceptor: getResourceAccessAcceptorMock,
    };

    const mockConstructFactory = mock.fn(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      <T extends ResourceProvider>(_: string) => ({
        getInstance: () => mockAuthResources as unknown as T,
      }),
    );

    const mockGetInstanceProps: ConstructFactoryGetInstanceProps = {
      constructContainer: {
        getConstructFactory: mockConstructFactory,
      } as unknown as ConstructContainer,
    } as unknown as ConstructFactoryGetInstanceProps;

    const accessDefinition = roleAccessBuilder
      .entity('identity')
      .to(['read', 'write', 'delete']);

    // Should still have 2 resource access acceptors
    assert.equal(accessDefinition.getResourceAccessAcceptors.length, 2);

    // Get the compound group acceptor (should be empty/no-op)
    const groupAcceptor =
      accessDefinition.getResourceAccessAcceptors[1](mockGetInstanceProps);
    assert.equal(groupAcceptor.identifier, 'entityAccessForAllGroups-empty');

    // Should not throw when called (no-op behavior)
    const stack = new Stack(new App(), 'TestStack');
    const emptyPolicy = new Policy(stack, 'EmptyPolicy', {
      statements: [new PolicyStatement()],
    });
    assert.doesNotThrow(() => {
      groupAcceptor.acceptResourceAccess(emptyPolicy, []);
    });
  });
});
