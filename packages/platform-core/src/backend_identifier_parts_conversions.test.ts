import { describe, it } from 'node:test';
import {
  backendIdentifierPartsToStackName,
  stackNameToBackendIdentifierParts,
} from './backend_identifier_parts_conversions.js';
import assert from 'node:assert';

void describe('backendIdentifierPartsToStackName', () => {
  void it('removes disallowed chars from namespace and instance', () => {
    const actual = backendIdentifierPartsToStackName({
      namespace: 't-_e.s,@ t--T@,,     H/I. .S',
      instance: 't-_h.i,@ ng',
      type: 'branch',
    });
    assert.equal(actual, 'amplify-testTHIS-thing-branch');
  });

  void it('truncates long instance names', () => {
    const actual = backendIdentifierPartsToStackName({
      namespace: 'reasonableName',
      instance:
        'InsanelyLongUserNameProvidedByCustomerDoNotKnowWhatCustomersAreThinkingWhenChoosingThisGreatBigName',
      type: 'sandbox',
    });
    assert.equal(actual, 'amplify-reasonableName-InsanelyLongUserName-sandbox');
  });

  void it('truncates long namespace names', () => {
    const actual = backendIdentifierPartsToStackName({
      namespace:
        'InsanelyLongNameProvidedByCustomerDoNotKnowWhatCustomersAreThinkingWhenChoosingThisGreatBigNameButItIsStillTheoreticallyPossible',
      instance: 'userName',
      type: 'sandbox',
    });
    assert.equal(
      actual,
      'amplify-InsanelyLongNameProvidedByCustomerDoNotKnowWhatCustomersAreThinkingWhenChoosingThisGreatBigNameButItIs-userName-sandbox'
    );
    assert.ok(actual.length <= 128);
  });

  void it('passes through values within the constraints', () => {
    const actual = backendIdentifierPartsToStackName({
      namespace: 'reasonableName',
      instance: 'userName',
      type: 'sandbox',
    });
    assert.equal(actual, 'amplify-reasonableName-userName-sandbox');
  });
});

void describe('stackNameToBackendIdentifierParts', () => {
  void it('returns undefined for undefined stack name', () => {
    const actual = stackNameToBackendIdentifierParts(undefined);
    assert.equal(actual, undefined);
  });

  void it('returns undefined if stack name does not have 4 parts', () => {
    const actual = stackNameToBackendIdentifierParts('amplify-missing-sandbox');
    assert.equal(actual, undefined);
  });

  void it('returns undefined if stack does not start with amplify prefix', () => {
    const actual = stackNameToBackendIdentifierParts('wrong-name-for-sandbox');
    assert.equal(actual, undefined);
  });

  void it('returns undefined if stack does not end with known type suffix', () => {
    const actual = stackNameToBackendIdentifierParts(
      'amplify-wrong-suffix-thing'
    );
    assert.equal(actual, undefined);
  });

  void it('parses valid stack name into parts', () => {
    const actual = stackNameToBackendIdentifierParts(
      'amplify-reasonableName-userName-sandbox'
    );
    assert.deepStrictEqual(actual, {
      namespace: 'reasonableName',
      instance: 'userName',
      type: 'sandbox',
    });
  });

  void it('valid stack name can round-trip back to same stack name', () => {
    const validStackName = 'amplify-reasonableName-userName-sandbox';
    const actual = backendIdentifierPartsToStackName(
      // the test will fail if this assertion is not valid
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      stackNameToBackendIdentifierParts(validStackName)!
    );
    assert.equal(actual, validStackName);
  });
});
