import { test, mock, describe } from 'node:test';
import assert from 'node:assert';
import { helloWorld } from './hello_world.js';

describe('Mocking functions', () => {
  describe('parameter assertions', () => {
    /**
     * @see https://nodejs.org/docs/latest-v18.x/api/assert.html#new-assertcalltracker
     */
    test('The program properly greets the world, verified by a CallTracker', () => {
      const tracker = new assert.CallTracker();
      const greeter = () => null;
      const greeterTracker = tracker.calls(greeter, 1);
      helloWorld(greeterTracker);
      assert.deepStrictEqual(tracker.getCalls(greeterTracker), [
        { thisArg: undefined, arguments: ['Hello, world.'] },
      ]);

      tracker.verify();
    });

    /**
     * @see https://nodejs.org/docs/latest-v18.x/api/test.html#mocking
     */
    test('The program properly greets the world, verified by a MockFunction', () => {
      const greeter = mock.fn();
      helloWorld(greeter);
      console.log(greeter.mock.calls);
      assert.deepStrictEqual(greeter.mock.calls[0].arguments, [
        'Hello, world.',
      ]);
      assert.equal(greeter.mock.callCount(), 1);
    });
  });
  describe('validate errors', () => {
    test('Throws a TypeError if the greeter is null', () => {
      const exercise = () => helloWorld(null as never);
      assert.throws(exercise, TypeError);
    });
  });
  describe('table tests', () => {
    type TestCase = {
      message: string;
    };

    const cases: TestCase[] = [{ message: 'Hello, world.' }];
    for (const testCase of cases) {
      test(`The message "${testCase.message}" is shown`, () => {
        const mockFn = mock.fn();
        helloWorld(mockFn);
        assert.equal(mockFn.mock.calls[0].arguments[0], testCase.message);
      });
    }
  });
});
