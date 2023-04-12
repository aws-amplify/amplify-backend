import { test, jest, expect } from '@jest/globals';
import { helloWorld } from './hello_world';

test('The program properly greets the world', () => {
  const greeter = jest.fn();
  helloWorld(greeter);
  expect(greeter).toHaveBeenCalledWith('Hello, world.');
});
