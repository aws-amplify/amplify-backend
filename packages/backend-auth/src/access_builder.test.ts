import { describe, it, mock } from 'node:test';
import { allowAccessBuilder } from './access_builder.js';
import {
  ConstructContainer,
  ConstructFactoryGetInstanceProps,
  ResourceAccessAcceptorFactory,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import assert from 'node:assert';

void describe('allowAccessBuilder', () => {
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

  const stubGetInstanceProps = {
    constructContainer: {
      getConstructFactory: getConstructFactoryMock,
    } as unknown as ConstructContainer,
  } as unknown as ConstructFactoryGetInstanceProps;

  void it('builds access definition for resource', () => {
    const accessDefinition = allowAccessBuilder
      .resource({
        getInstance: () =>
          ({
            getResourceAccessAcceptor: getResourceAccessAcceptorMock,
          } as unknown as ResourceProvider & ResourceAccessAcceptorFactory),
      })
      .to(['createUser', 'deleteUser', 'setUserPassword']);

    assert.deepStrictEqual(accessDefinition.actions, [
      'createUser',
      'deleteUser',
      'setUserPassword',
    ]);
    assert.equal(
      accessDefinition.getResourceAccessAcceptor(stubGetInstanceProps),
      resourceAccessAcceptorMock
    );
  });
});
