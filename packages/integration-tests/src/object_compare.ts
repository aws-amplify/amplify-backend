import assert from 'node:assert';

export type Predicate = (actual: unknown, expected: unknown) => boolean;
export type ObjectPath = (string | number)[];

/**
 * Asserts that actual and expected are the same according to custom matchers + deepStrictEqual
 * customMatchers are key/value pairs of an object path and a predicate.
 * The value at the specified object path will be compared using the corresponding predicate rather than deepStrictEqual
 * All other values are compared using deepStrictEqual
 */
export const assertCustomMatch = (
  actual: unknown,
  expected: unknown,
  customMatchers: Map<ObjectPath, Predicate>
): void => {
  customMatchers.forEach((predicate, objectPath) => {
    const actualValue = removeValueFromObject(actual, objectPath);
    const expectedValue = removeValueFromObject(expected, objectPath);
    if (expectedValue === undefined && actualValue === undefined) {
      return;
    }
    assert.ok(
      predicate(actualValue, expectedValue),
      `expected value ${expectedValue as string} and actual value ${
        actualValue as string
      } at [${objectPath.toLocaleString()}] path did not match based on the custom predicate`
    );
  });

  // now that we have removed all the custom paths, check for equality of the remaining object
  assert.deepStrictEqual(actual, expected);
};

/**
 * Mutates obj to remove the value at objectPath and returns the removed value
 * @param obj The object to search
 * @param objectPath An array defining a sub object within obj.
 *  For example, a path of ['foo', 'bar', 2] would look up obj.foo.bar[2]
 */
const removeValueFromObject = (
  obj: unknown,
  objectPath: ObjectPath
): unknown | undefined => {
  if (objectPath.length === 0) {
    return;
  }

  const pathCopy = [...objectPath];

  // non-null assertion is safe here because we checked for objectPath length above
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const last = pathCopy.pop()!;
  const subObj = pathCopy.reduce(
    (obj, key) => (obj as never)?.[key],
    obj
  ) as Record<string, unknown>;
  const val = subObj?.[last];
  delete subObj?.[last];
  return val;
};
