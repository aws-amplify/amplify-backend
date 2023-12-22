import { describe, it } from 'node:test';
import { ParameterPathConversions } from './parameter_path_conversions';
import assert from 'node:assert';

void describe('toParameterPrefix', () => {
  void it('passes through values for type sandbox', () => {
    const actual = ParameterPathConversions.toParameterPrefix({
      namespace: 'reasonableName',
      name: 'userName',
      type: 'sandbox',
    });
    assert.equal(actual, '/amplify/reasonableName/userName');
  });

  void it('passes through values for shared parameter', () => {
    const actual = ParameterPathConversions.toParameterPrefix('someAppId');
    assert.equal(actual, '/amplify/shared/someAppId');
  });
});

void describe('toParameterFullPath', () => {
  void it('passes through values for type sandbox', () => {
    const actual = ParameterPathConversions.toParameterFullPath(
      {
        namespace: 'reasonableName',
        name: 'userName',
        type: 'sandbox',
      },
      'secretName'
    );
    assert.equal(actual, '/amplify/reasonableName/userName/secretName');
  });

  void it('passes through values for shared parameter', () => {
    const actual = ParameterPathConversions.toParameterFullPath(
      'someAppId',
      'secretName'
    );
    assert.equal(actual, '/amplify/shared/someAppId/secretName');
  });
});
