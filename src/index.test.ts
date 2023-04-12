import { test, jest, expect } from '@jest/globals';

test('The program properly greets the world', () => {
  const consoleSpy = jest.spyOn(console, 'log');
  require('./');
  expect(consoleSpy).toHaveBeenCalledWith('Hello, world.');
});
