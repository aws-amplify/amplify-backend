import { describe, it } from 'node:test';
import { BackendIdentifierConversions } from './backend_identifier_conversions.js';
import assert from 'node:assert';
import { BackendIdentifier } from '@aws-amplify/plugin-types';

void describe('toStackName', () => {
  void it('removes non-alphanumeric chars from namespace and instance', () => {
    const actual = BackendIdentifierConversions.toStackName({
      namespace: 't-_e.s,@ t--T@,,  !@#$%^&*(){}:":<>?/|\\[]   H/I. .S',
      name: 't-_h.i,@ ng1-&&%2@@3-   _',
      type: 'branch',
    });
    // eslint-disable-next-line spellcheck/spell-checker
    assert.equal(actual, 'amplify-testTHIS-thing123-branch-70899a9dd1');
  });

  void it('truncates long name', () => {
    const actual = BackendIdentifierConversions.toStackName({
      namespace: 'reasonableName',
      name: 'InsanelyLongUserNameProvidedByCustomerDoNotKnowWhatCustomersAreThinkingWhenChoosingThisGreatBigName',
      type: 'sandbox',
    });
    assert.equal(
      actual,
      'amplify-reasonableName-InsanelyLongUserNameProvidedByCustomerDoNotKnowWha-sandbox-25ed708259'
    );
  });

  void it('truncates long namespace', () => {
    const actual = BackendIdentifierConversions.toStackName({
      namespace:
        'InsanelyLongNamespaceProvidedByCustomerDoNotKnowWhatCustomersAreThinkingWhenChoosingThisGreatBigNameButItIsStillTheoreticallyPossible',
      name: 'userName',
      type: 'sandbox',
    });
    assert.equal(
      actual,
      'amplify-InsanelyLongNamespaceProvidedByCustomerDoNotKnowWhatCustomersAreThinkingWhenChoosingThisGre-userName-sandbox-119c592989'
    );
    assert.ok(actual.length <= 128);
  });

  void it('truncates long namespace and name', () => {
    const actual = BackendIdentifierConversions.toStackName({
      namespace:
        'InsanelyLongNameProvidedByCustomerDoNotKnowWhatCustomersAreThinkingWhenChoosingThisGreatBigNameButItIsStillTheoreticallyPossible',
      name: 'InsanelyLongUserNameProvidedByCustomerDoNotKnowWhatCustomersAreThinkingWhenChoosingThisGreatBigName',

      type: 'sandbox',
    });
    assert.equal(
      actual,
      // eslint-disable-next-line spellcheck/spell-checker
      'amplify-InsanelyLongNameProvidedByCustomerDoNotKnowWhatCu-InsanelyLongUserNameProvidedByCustomerDoNotKnowWha-sandbox-4abbed907b'
    );
    assert.ok(actual.length <= 128);
  });

  void it('passes through values within the constraints', () => {
    const actual = BackendIdentifierConversions.toStackName({
      namespace: 'reasonableName',
      name: 'userName',
      type: 'sandbox',
      hash: 'testHash',
    });
    assert.equal(actual, 'amplify-reasonableName-userName-sandbox-testHash');
  });
});

void describe('fromStackName', () => {
  void it('returns undefined for undefined stack name', () => {
    const actual = BackendIdentifierConversions.fromStackName(undefined);
    assert.equal(actual, undefined);
  });

  void it('returns undefined if stack name does not have 5 parts', () => {
    const actual = BackendIdentifierConversions.fromStackName(
      'amplify-missing-sandbox-testHash'
    );
    assert.equal(actual, undefined);
  });

  void it('returns undefined if stack does not start with amplify prefix', () => {
    const actual = BackendIdentifierConversions.fromStackName(
      'wrong-name-for-amplify-stack'
    );
    assert.equal(actual, undefined);
  });

  void it('returns undefined if stack does not include known type suffix', () => {
    const actual = BackendIdentifierConversions.fromStackName(
      'amplify-wrong-suffix-thing-testHash'
    );
    assert.equal(actual, undefined);
  });

  void it('parses valid stack name into parts', () => {
    const actual = BackendIdentifierConversions.fromStackName(
      'amplify-reasonableName-userName-sandbox-testHash'
    );
    assert.deepStrictEqual(actual, {
      namespace: 'reasonableName',
      name: 'userName',
      type: 'sandbox',
      hash: 'testHash',
    });
  });
});

void it('stack name round trips to same name even when replacements are required', () => {
  const backendId: BackendIdentifier = {
    namespace: 't-_e.s,@ t--T@,,  !@#$%^&*(){}:":<>?/|\\[]   H/I. .S',
    name: 't-_h.i,@ ng1-&&%2@@3-   _',
    type: 'branch',
  };
  const originalStackName = BackendIdentifierConversions.toStackName(backendId);
  const roundTripStackName = BackendIdentifierConversions.toStackName(
    // if this conversion returns undefined, the test will fail anyway
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    BackendIdentifierConversions.fromStackName(originalStackName)!
  );
  assert.equal(
    originalStackName,
    // eslint-disable-next-line spellcheck/spell-checker
    'amplify-testTHIS-thing123-branch-70899a9dd1'
  );
  assert.equal(roundTripStackName, originalStackName);
});
