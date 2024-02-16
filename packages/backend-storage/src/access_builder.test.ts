import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { roleAccessBuilder } from './access_builder.js';
import {
  ConstructContainer,
  ConstructFactoryGetInstanceProps,
  ResourceAccessAcceptorFactory,
  ResourceProvider,
} from '@aws-amplify/plugin-types';

void describe('storageAccessBuilder', () => {
  const resourceAccessAcceptorMock = mock.fn();

  const getResourceAccessAcceptorMock = mock.fn(
    // allows us to get proper typing on the mock args
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_: string) => resourceAccessAcceptorMock
  );

  const getConstructFactoryMock = mock.fn(
    // this lets us get proper typing on the mock args
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    <T extends ResourceProvider>(_: string) => ({
      getInstance: () =>
        ({
          getResourceAccessAcceptor: getResourceAccessAcceptorMock,
        } as unknown as T),
    })
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
    const accessDefinition = roleAccessBuilder.authenticated.to(
      'read',
      'write',
      'delete'
    );
    assert.deepStrictEqual(accessDefinition.actions, [
      'read',
      'write',
      'delete',
    ]);
    assert.equal(accessDefinition.ownerPlaceholderSubstitution, '*');
    assert.equal(
      accessDefinition.getResourceAccessAcceptor(stubGetInstanceProps),
      resourceAccessAcceptorMock
    );
    assert.equal(
      getConstructFactoryMock.mock.calls[0].arguments[0],
      'AuthResources'
    );
    assert.equal(
      getResourceAccessAcceptorMock.mock.calls[0].arguments[0],
      'authenticatedUserIamRole'
    );
  });
  void it('builds storage access definition for guest role', () => {
    const accessDefinition = roleAccessBuilder.guest.to(
      'read',
      'write',
      'delete'
    );
    assert.deepStrictEqual(accessDefinition.actions, [
      'read',
      'write',
      'delete',
    ]);
    assert.equal(accessDefinition.ownerPlaceholderSubstitution, '*');
    assert.equal(
      accessDefinition.getResourceAccessAcceptor(stubGetInstanceProps),
      resourceAccessAcceptorMock
    );
    assert.equal(
      getConstructFactoryMock.mock.calls[0].arguments[0],
      'AuthResources'
    );
    assert.equal(
      getResourceAccessAcceptorMock.mock.calls[0].arguments[0],
      'unauthenticatedUserIamRole'
    );
  });
  void it('builds storage access definition for owner', () => {
    const accessDefinition = roleAccessBuilder.owner.to(
      'read',
      'write',
      'delete'
    );
    assert.deepStrictEqual(accessDefinition.actions, [
      'read',
      'write',
      'delete',
    ]);
    assert.equal(
      accessDefinition.ownerPlaceholderSubstitution,
      '${cognito-identity.amazon.com:sub}'
    );
    assert.equal(
      accessDefinition.getResourceAccessAcceptor(stubGetInstanceProps),
      resourceAccessAcceptorMock
    );
    assert.equal(
      getConstructFactoryMock.mock.calls[0].arguments[0],
      'AuthResources'
    );
    assert.equal(
      getResourceAccessAcceptorMock.mock.calls[0].arguments[0],
      'authenticatedUserIamRole'
    );
  });

  void it('builds storage access definition for resources', () => {
    const accessDefinition = roleAccessBuilder
      .resource({
        getInstance: () =>
          ({
            getResourceAccessAcceptor: getResourceAccessAcceptorMock,
          } as unknown as ResourceProvider & ResourceAccessAcceptorFactory),
      })
      .to('read', 'write', 'delete');

    assert.deepStrictEqual(accessDefinition.actions, [
      'read',
      'write',
      'delete',
    ]);
    assert.equal(accessDefinition.ownerPlaceholderSubstitution, '*');
    assert.equal(
      accessDefinition.getResourceAccessAcceptor(stubGetInstanceProps),
      resourceAccessAcceptorMock
    );
  });
});
