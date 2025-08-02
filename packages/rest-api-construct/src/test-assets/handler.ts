import type { Handler } from 'aws-lambda';

/**
 * Test function
 * @returns the string "Hello, World!"
 */
export const handler: Handler = async () => {
  return 'Hello, World!';
};
