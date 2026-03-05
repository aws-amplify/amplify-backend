import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { definePostgresData } from './postgres_factory.js';
import { aurora } from './providers/aurora_provider.js';
import { BackendSecret } from '@aws-amplify/plugin-types';
import * as factory from './factory.js';

void describe('definePostgresData', () => {
  void it('transforms PostgresDataProps to DataProps', () => {
    const mockDefineData = mock.fn((props) => props);
    mock.method(factory, 'defineData', mockDefineData);

    const mockSecret = {} as BackendSecret;
    const provider = aurora({ connectionUri: mockSecret });
    const schema = 'type Query { hello: String }';

    definePostgresData({
      provider,
      schema,
      name: 'TestAPI',
    });

    assert.strictEqual(mockDefineData.mock.calls.length, 1);
    const callArgs = mockDefineData.mock.calls[0].arguments[0];
    assert.strictEqual(callArgs.schema, schema);
    assert.strictEqual(callArgs.name, 'TestAPI');
    assert.strictEqual(callArgs.database.provider, provider);
  });

  void it('passes through additional DataProps', () => {
    const mockDefineData = mock.fn((props) => props);
    mock.method(factory, 'defineData', mockDefineData);

    const mockSecret = {} as BackendSecret;
    const provider = aurora({ connectionUri: mockSecret });
    const schema = 'type Query { hello: String }';

    definePostgresData({
      provider,
      schema,
      name: 'TestAPI',
      authorizationModes: {
        defaultAuthorizationMode: 'apiKey',
      },
    });

    const callArgs = mockDefineData.mock.calls[0].arguments[0];
    assert.ok(callArgs.authorizationModes);
    assert.strictEqual(
      callArgs.authorizationModes.defaultAuthorizationMode,
      'apiKey',
    );
  });
});
