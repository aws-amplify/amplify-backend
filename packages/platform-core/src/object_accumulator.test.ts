import { describe, it } from 'node:test';
import * as assert from 'assert';
import {
  ObjectAccumulator,
  ObjectAccumulatorPropertyAlreadyExistsError,
  ObjectAccumulatorVersionMismatchError,
} from './object_accumulator';

void describe('Object accumulator', () => {
  void it('should merge two non-overlapping objects', () => {
    const object1 = {
      a1: 'valueA1',
      b1: {
        c1: 'valueC1',
        d1: {
          e1: 'valueE1',
        },
      },
    };
    const object2 = {
      a2: 'valueA2',
      b2: {
        c2: 'valueC2',
        d2: {
          e2: 'valueE2',
        },
      },
    };
    const accumulatedObject = new ObjectAccumulator({})
      .accumulate(object1)
      .accumulate(object2)
      .getAccumulatedObject();

    assert.deepEqual(accumulatedObject, {
      a1: 'valueA1',
      a2: 'valueA2',
      b1: {
        c1: 'valueC1',
        d1: {
          e1: 'valueE1',
        },
      },
      b2: {
        c2: 'valueC2',
        d2: {
          e2: 'valueE2',
        },
      },
    });
  });

  void it('should join arrays while merging', () => {
    const object1 = {
      array1: ['valueA1'],
      a: {
        array2: [{ b: 'b1' }],
      },
    };
    const object2 = {
      array1: ['valueA2'],
      a: {
        array2: [{ b: 'b2' }],
      },
    };

    const accumulatedObject = new ObjectAccumulator({})
      .accumulate(object1)
      .accumulate(object2)
      .getAccumulatedObject();

    assert.deepEqual(accumulatedObject, {
      a: {
        array2: [
          {
            b: 'b1',
          },
          {
            b: 'b2',
          },
        ],
      },
      array1: ['valueA1', 'valueA2'],
    });
  });

  void it('should merge two objects with same version', () => {
    const object1 = {
      myVersionKey: '1',
      a1: 'valueA1',
      b1: {
        c1: 'valueC1',
        d1: {
          e1: 'valueE1',
        },
      },
    };
    const object2 = {
      myVersionKey: '1',
      a2: 'valueA2',
      b2: {
        c2: 'valueC2',
        d2: {
          e2: 'valueE2',
        },
      },
    };
    const accumulatedObject = new ObjectAccumulator({}, 'myVersionKey')
      .accumulate(object1)
      .accumulate(object2)
      .getAccumulatedObject();

    assert.deepEqual(accumulatedObject, {
      myVersionKey: '1',
      a1: 'valueA1',
      a2: 'valueA2',
      b1: {
        c1: 'valueC1',
        d1: {
          e1: 'valueE1',
        },
      },
      b2: {
        c2: 'valueC2',
        d2: {
          e2: 'valueE2',
        },
      },
    });
  });

  void it('should throw on property override attempt', () => {
    assert.throws(
      () => {
        new ObjectAccumulator({})
          .accumulate({
            a: {
              b: 'b1',
            },
          })
          .accumulate({
            a: {
              b: 'b2',
            },
          });
      },
      (error: ObjectAccumulatorPropertyAlreadyExistsError) => {
        assert.strictEqual(error.message, 'Property b already exists');
        assert.strictEqual(error.key, 'b');
        assert.strictEqual(error.existingValue, 'b1');
        assert.strictEqual(error.incomingValue, 'b2');
        return true;
      }
    );
  });

  void it('should throw on version mismatch of objects', () => {
    assert.throws(
      () => {
        new ObjectAccumulator({}) // using default version key of `version`
          .accumulate({
            version: '1',
            a: {
              b: 'b1',
            },
          })
          .accumulate({
            version: '2',
            a: {
              b: 'b2',
            },
          });
      },
      (error: ObjectAccumulatorVersionMismatchError) => {
        assert.strictEqual(
          error.message,
          'Version mismatch: Cannot accumulate new objects with version 2 with existing accumulated object with version 1'
        );
        assert.strictEqual(error.existingVersion, '1');
        assert.strictEqual(error.newVersion, '2');
        return true;
      }
    );
  });
});
