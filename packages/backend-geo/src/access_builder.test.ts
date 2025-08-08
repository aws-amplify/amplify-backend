import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { roleAccessBuilder } from './access_builder.js';
import {
  ConstructContainer,
  ConstructFactoryGetInstanceProps,
  ResourceProvider,
} from '@aws-amplify/plugin-types';

void describe('GeoAccessBuilder', () => {
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

  const mockGetInstanceProps: ConstructFactoryGetInstanceProps = {
    constructContainer: {
      getConstructFactory: getConstructFactoryMock,
    } as unknown as ConstructContainer,
  } as unknown as ConstructFactoryGetInstanceProps;

  beforeEach(() => {
    getResourceAccessAcceptorMock.mock.resetCalls();
    getConstructFactoryMock.mock.resetCalls();
    resourceAccessAcceptorMock.mock.resetCalls();
    group1AccessAcceptorMock.mock.resetCalls();
    group2AccessAcceptorMock.mock.resetCalls();
  });

  void it('builds geo access definition for authenticated role', () => {
    const accessDefinition = roleAccessBuilder.authenticated.to([
      'get',
      'search',
    ]);

    assert.deepStrictEqual(accessDefinition.actions, ['get', 'search']);
    assert.deepStrictEqual(
      accessDefinition.getAccessAcceptors.map((getAccessAcceptor) =>
        getAccessAcceptor(mockGetInstanceProps),
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
    assert.equal(accessDefinition.uniqueDefinitionValidators.length, 1);
    assert.equal(
      accessDefinition.uniqueDefinitionValidators[0].uniqueRoleToken,
      'authenticated',
    );
    assert.equal(
      accessDefinition.uniqueDefinitionValidators[0].validationErrorOptions
        .message,
      'Access definition for authenticated users specified multiple times.',
    );
  });

  void it('builds geo access definition for guest role', () => {
    const accessDefinition = roleAccessBuilder.guest.to(['get']);

    assert.deepStrictEqual(accessDefinition.actions, ['get']);
    assert.deepStrictEqual(
      accessDefinition.getAccessAcceptors.map((getAccessAcceptor) =>
        getAccessAcceptor(mockGetInstanceProps),
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
    assert.equal(accessDefinition.uniqueDefinitionValidators.length, 1);
    assert.equal(
      accessDefinition.uniqueDefinitionValidators[0].uniqueRoleToken,
      'guest',
    );
    assert.equal(
      accessDefinition.uniqueDefinitionValidators[0].validationErrorOptions
        .message,
      'Access definition for guest users specified multiple times.',
    );
  });

  void it('builds geo access definition for single user pool group', () => {
    const accessDefinition = roleAccessBuilder
      .groups(['group1Name'])
      .to(['create', 'read']);

    assert.deepStrictEqual(accessDefinition.actions, ['create', 'read']);
    assert.deepStrictEqual(
      accessDefinition.getAccessAcceptors.map((getAccessAcceptor) =>
        getAccessAcceptor(mockGetInstanceProps),
      ),
      [group1AccessAcceptorMock],
    );
    assert.equal(
      getConstructFactoryMock.mock.calls[0].arguments[0],
      'AuthResources',
    );
    assert.equal(
      getResourceAccessAcceptorMock.mock.calls[0].arguments[0],
      'group1Name',
    );
    assert.equal(accessDefinition.uniqueDefinitionValidators.length, 1);
    assert.equal(
      accessDefinition.uniqueDefinitionValidators[0].uniqueRoleToken,
      'group-group1Name',
    );
    assert.equal(
      accessDefinition.uniqueDefinitionValidators[0].validationErrorOptions
        .message,
      'Access definition for the group group1Name specified multiple times.',
    );
  });

  void it('builds geo access definition for multiple user pool groups', () => {
    const accessDefinition = roleAccessBuilder
      .groups(['group1Name', 'group2Name'])
      .to(['update', 'delete']);

    assert.deepStrictEqual(accessDefinition.actions, ['update', 'delete']);
    assert.deepStrictEqual(
      accessDefinition.getAccessAcceptors.map((getAccessAcceptor) =>
        getAccessAcceptor(mockGetInstanceProps),
      ),
      [group1AccessAcceptorMock, group2AccessAcceptorMock],
    );
    assert.equal(
      getConstructFactoryMock.mock.calls[0].arguments[0],
      'AuthResources',
    );
    assert.equal(
      getConstructFactoryMock.mock.calls[1].arguments[0],
      'AuthResources',
    );
    assert.equal(
      getResourceAccessAcceptorMock.mock.calls[0].arguments[0],
      'group1Name',
    );
    assert.equal(
      getResourceAccessAcceptorMock.mock.calls[1].arguments[0],
      'group2Name',
    );
    assert.equal(accessDefinition.uniqueDefinitionValidators.length, 2);
    assert.equal(
      accessDefinition.uniqueDefinitionValidators[0].uniqueRoleToken,
      'group-group1Name',
    );
    assert.equal(
      accessDefinition.uniqueDefinitionValidators[1].uniqueRoleToken,
      'group-group2Name',
    );
    assert.equal(
      accessDefinition.uniqueDefinitionValidators[0].validationErrorOptions
        .message,
      'Access definition for the group group1Name specified multiple times.',
    );
    assert.equal(
      accessDefinition.uniqueDefinitionValidators[1].validationErrorOptions
        .message,
      'Access definition for the group group2Name specified multiple times.',
    );
  });

  void it('builds geo access definition for api keys', () => {
    const accessDefinition = roleAccessBuilder.apiKey.to(['search', 'geocode']);

    assert.deepStrictEqual(accessDefinition.actions, ['search', 'geocode']);
    assert.deepStrictEqual(
      accessDefinition.getAccessAcceptors.map((getAccessAcceptor) =>
        getAccessAcceptor(mockGetInstanceProps),
      ),
      [],
    );

    assert.equal(accessDefinition.uniqueDefinitionValidators.length, 1);
    assert.equal(
      accessDefinition.uniqueDefinitionValidators[0].uniqueRoleToken,
      'api key',
    );
    assert.equal(
      accessDefinition.uniqueDefinitionValidators[0].validationErrorOptions
        .message,
      'Access definition for api key specified multiple times.',
    );
  });

  void it('throws error when auth construct factory is not found', () => {
    const getConstructFactoryMockReturnsNull = mock.fn(() => null);
    const stubGetInstancePropsWithNullFactory: ConstructFactoryGetInstanceProps =
      {
        constructContainer: {
          getConstructFactory: getConstructFactoryMockReturnsNull,
        } as unknown as ConstructContainer,
      } as unknown as ConstructFactoryGetInstanceProps;

    const accessDefinition = roleAccessBuilder.authenticated.to(['get']);

    assert.throws(
      () => {
        accessDefinition.getAccessAcceptors[0](
          stubGetInstancePropsWithNullFactory,
        );
      },
      {
        message:
          'Cannot specify geo resource access for authenticatedUserIamRole users without defining auth. See https://docs.amplify.aws/gen2/build-a-backend/auth/set-up-auth/ for more information.',
      },
    );
  });

  void it('throws error when auth construct factory getInstance returns null resource access acceptor', () => {
    const getResourceAccessAcceptorMockReturnsNull = mock.fn(() => null);
    const getConstructFactoryMockWithNullAcceptor = mock.fn(() => ({
      getInstance: () => ({
        getResourceAccessAcceptor: getResourceAccessAcceptorMockReturnsNull,
      }),
    }));

    const stubGetInstancePropsWithNullAcceptor: ConstructFactoryGetInstanceProps =
      {
        constructContainer: {
          getConstructFactory: getConstructFactoryMockWithNullAcceptor,
        } as unknown as ConstructContainer,
      } as unknown as ConstructFactoryGetInstanceProps;

    const accessDefinition = roleAccessBuilder.guest.to(['get']);

    assert.throws(
      () => {
        accessDefinition.getAccessAcceptors[0](
          stubGetInstancePropsWithNullAcceptor,
        );
      },
      {
        message:
          'Cannot specify geo resource access for unauthenticatedUserIamRole users without defining auth. See https://docs.amplify.aws/gen2/build-a-backend/auth/set-up-auth/ for more information.',
      },
    );
  });

  void it('throws error for group access when auth is not defined', () => {
    const getConstructFactoryMockReturnsNull = mock.fn(() => null);
    const stubGetInstancePropsWithNullFactory: ConstructFactoryGetInstanceProps =
      {
        constructContainer: {
          getConstructFactory: getConstructFactoryMockReturnsNull,
        } as unknown as ConstructContainer,
      } as unknown as ConstructFactoryGetInstanceProps;

    const accessDefinition = roleAccessBuilder
      .groups(['testGroup'])
      .to(['get']);

    assert.throws(
      () => {
        accessDefinition.getAccessAcceptors[0](
          stubGetInstancePropsWithNullFactory,
        );
      },
      {
        message:
          'Cannot specify geo resource access for testGroup users without defining auth. See https://docs.amplify.aws/gen2/build-a-backend/auth/set-up-auth/ for more information.',
      },
    );
  });
});
