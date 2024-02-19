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
    assert.equal(actual, '/amplify/reasonableName/userName-sandbox-99c4c0494a');
  });

  void it('passes through values for shared parameter', () => {
    const actual = ParameterPathConversions.toParameterPrefix('someAppId');
    assert.equal(actual, '/amplify/shared/someAppId');
  });

  void it('removes non-alphanumeric chars from namespace and name', () => {
    const actual = ParameterPathConversions.toParameterPrefix({
      namespace: 't-_e.s,@ t--T@,,  !@#$%^&*(){}:":<>?/|\\[]   H/I. .S',
      name: 't-_h.i,@ ng1-&&%2@@3-   _',
      type: 'branch',
    });
    // eslint-disable-next-line spellcheck/spell-checker
    assert.equal(actual, '/amplify/testTHIS/thing123-branch-70899a9dd1');
  });

  void it('truncates long name', () => {
    const actual = ParameterPathConversions.toParameterPrefix({
      namespace: 'reasonableName',
      name: 'InsanelyLongUserNameProvidedByCustomerDoNotKnowWhatCustomersAreThinkingWhenChoosingThisGreatBigName',
      type: 'sandbox',
    });
    assert.equal(
      actual,
      '/amplify/reasonableName/InsanelyLongUserNameProvidedByCustomerDoNotKnowWha-sandbox-25ed708259'
    );
  });

  void it('truncates long namespace', () => {
    const actual = ParameterPathConversions.toParameterPrefix({
      namespace:
        'InsanelyLongNamespaceProvidedByCustomerDoNotKnowWhatCustomersAreThinkingWhenChoosingThisGreatBigNameButItIsStillTheoreticallyPossible',
      name: 'userName',
      type: 'sandbox',
    });
    assert.equal(
      actual,
      '/amplify/InsanelyLongNamespaceProvidedByCustomerDoNotKnowWhatCustomersAreThinkingWhenChoosingThisGre/userName-sandbox-119c592989'
    );
    assert.ok(actual.length <= 128);
  });

  void it('truncates long namespace and name', () => {
    const actual = ParameterPathConversions.toParameterPrefix({
      namespace:
        'InsanelyLongNameProvidedByCustomerDoNotKnowWhatCustomersAreThinkingWhenChoosingThisGreatBigNameButItIsStillTheoreticallyPossible',
      name: 'InsanelyLongUserNameProvidedByCustomerDoNotKnowWhatCustomersAreThinkingWhenChoosingThisGreatBigName',

      type: 'sandbox',
    });
    assert.equal(
      actual,
      // eslint-disable-next-line spellcheck/spell-checker
      '/amplify/InsanelyLongNameProvidedByCustomerDoNotKnowWhatCu/InsanelyLongUserNameProvidedByCustomerDoNotKnowWha-sandbox-4abbed907b'
    );
    assert.ok(actual.length <= 128);
  });

  void it('passes through values within the constraints', () => {
    const actual = ParameterPathConversions.toParameterPrefix({
      namespace: 'reasonableName',
      name: 'userName',
      type: 'sandbox',
      hash: 'testHash',
    });
    assert.equal(actual, '/amplify/reasonableName/userName-sandbox-testHash');
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
    assert.equal(
      actual,
      '/amplify/reasonableName/userName-sandbox-99c4c0494a/secretName'
    );
  });

  void it('passes through values for shared parameter', () => {
    const actual = ParameterPathConversions.toParameterFullPath(
      'someAppId',
      'secretName'
    );
    assert.equal(actual, '/amplify/shared/someAppId/secretName');
  });
});

void describe('toResourceReferenceFullPath', () => {
  void it('constructs path unique to the backend id', () => {
    const actual = ParameterPathConversions.toResourceReferenceFullPath(
      {
        namespace: 'reasonableName',
        name: 'userName',
        type: 'sandbox',
      },
      'someResourceReferenceName'
    );
    assert.equal(
      actual,
      '/amplify/resource_reference/reasonableName/userName-sandbox-99c4c0494a/someResourceReferenceName'
    );
  });
});
