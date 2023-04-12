import { test, jest, expect } from '@jest/globals';
import {helloWorld} from './hello_world'

test('The program properly greets the world', () => {
  const consoleSpy = jest.spyOn(console, 'log');
  helloWorld()
  expect(consoleSpy).toHaveBeenCalledWith('Hello, world.');
});
