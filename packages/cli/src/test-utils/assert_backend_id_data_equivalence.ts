import {
  UniqueBackendIdentifier,
  UniqueBackendIdentifierData,
} from '@aws-amplify/plugin-types';
import assert from 'node:assert';

/**
 * Asserts that the data fields in actual match the data fields in expected,
 * ignoring methods that may exist on the objects
 */
export const assertBackendIdDataEquivalence = (
  actual: UniqueBackendIdentifier | undefined,
  expected: UniqueBackendIdentifierData
) => {
  assert.equal(actual?.backendId, expected.backendId);
  assert.equal(actual?.disambiguator, expected.disambiguator);
};
