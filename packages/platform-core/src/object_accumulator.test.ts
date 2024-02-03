import { describe, it } from 'node:test';
import * as assert from 'assert';
import { ObjectAccumulator } from './object_accumulator';

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
      (error: Error) => {
        assert.strictEqual(error.message, 'key b is already defined');
        return true;
      }
    );
  });
});
