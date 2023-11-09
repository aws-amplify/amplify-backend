import { describe, it } from 'node:test';
import { BackendIdentifierConversions } from './backend_identifier_parts_conversions.js';
import assert from 'node:assert';

void describe('toStackName', () => {
  void it('removes disallowed chars from namespace and instance', () => {
    const actual = BackendIdentifierConversions.toStackName({
      namespace: 't-_e.s,@ t--T@,,     H/I. .S',
      name: 't-_h.i,@ ng',
      type: 'branch',
    });
    assert.equal(actual, 'amplify-testTHIS-thing-branch');
  });

  void it('truncates long instance names', () => {
    const actual = BackendIdentifierConversions.toStackName({
      namespace: 'reasonableName',
      name: 'InsanelyLongUserNameProvidedByCustomerDoNotKnowWhatCustomersAreThinkingWhenChoosingThisGreatBigName',
      type: 'sandbox',
    });
    assert.equal(
      actual,
      'amplify-reasonableName-InsanelyLongUserNameProvidedByCustomerDoNotKnowWha-sandbox'
    );
  });

  void it('truncates long namespace names', () => {
    const actual = BackendIdentifierConversions.toStackName({
      namespace:
        'InsanelyLongNameProvidedByCustomerDoNotKnowWhatCustomersAreThinkingWhenChoosingThisGreatBigNameButItIsStillTheoreticallyPossible',
      name: 'userName',
      type: 'sandbox',
    });
    assert.equal(
      actual,
      'amplify-InsanelyLongNameProvidedByCustomerDoNotKnowWhatCustomersAreThinkingWhenChoosingThisGreatBigNameButItIs-userName-sandbox'
    );
    assert.ok(actual.length <= 128);
  });

  void it('truncates long namespace and instance', () => {
    const actual = BackendIdentifierConversions.toStackName({
      namespace:
        'InsanelyLongNameProvidedByCustomerDoNotKnowWhatCustomersAreThinkingWhenChoosingThisGreatBigNameButItIsStillTheoreticallyPossible',
      name: 'InsanelyLongUserNameProvidedByCustomerDoNotKnowWhatCustomersAreThinkingWhenChoosingThisGreatBigName',

      type: 'sandbox',
    });
    assert.equal(
      actual,
      'amplify-InsanelyLongNameProvidedByCustomerDoNotKnowWhatCustomersAreT-InsanelyLongUserNameProvidedByCustomerDoNotKnowWha-sandbox'
    );
    assert.ok(actual.length <= 128);
  });

  void it('passes through values within the constraints', () => {
    const actual = BackendIdentifierConversions.toStackName({
      namespace: 'reasonableName',
      name: 'userName',
      type: 'sandbox',
    });
    assert.equal(actual, 'amplify-reasonableName-userName-sandbox');
  });
});

void describe('fromStackName', () => {
  void it('returns undefined for undefined stack name', () => {
    const actual = BackendIdentifierConversions.fromStackName(undefined);
    assert.equal(actual, undefined);
  });

  void it('returns undefined if stack name does not have 4 parts', () => {
    const actual = BackendIdentifierConversions.fromStackName(
      'amplify-missing-sandbox'
    );
    assert.equal(actual, undefined);
  });

  void it('returns undefined if stack does not start with amplify prefix', () => {
    const actual = BackendIdentifierConversions.fromStackName(
      'wrong-name-for-sandbox'
    );
    assert.equal(actual, undefined);
  });

  void it('returns undefined if stack does not end with known type suffix', () => {
    const actual = BackendIdentifierConversions.fromStackName(
      'amplify-wrong-suffix-thing'
    );
    assert.equal(actual, undefined);
  });

  void it('parses valid stack name into parts', () => {
    const actual = BackendIdentifierConversions.fromStackName(
      'amplify-reasonableName-userName-sandbox'
    );
    assert.deepStrictEqual(actual, {
      namespace: 'reasonableName',
      name: 'userName',
      type: 'sandbox',
    });
  });

  void it('valid stack name can round-trip back to same stack name', () => {
    const validStackName = 'amplify-reasonableName-userName-sandbox';
    const actual = BackendIdentifierConversions.toStackName(
      // the test will fail if this assertion is not valid
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      BackendIdentifierConversions.fromStackName(validStackName)!
    );
    assert.equal(actual, validStackName);
  });
});
