import { test, jest, expect } from '@jest/globals';
import { helloWorld } from './hello_world.js';

test('The program properly greets the world', () => {
  const greeter = jest.fn();
  helloWorld(greeter);
  expect(greeter).toHaveBeenCalledWith('Hello, world.');
});
