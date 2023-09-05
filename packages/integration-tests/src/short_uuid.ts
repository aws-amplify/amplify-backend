import { randomUUID } from 'crypto';

/**
 * Generate a short UUID
 */
export const shortUuid = (): string => {
  const result = randomUUID().split('-').at(-1);
  if (typeof result !== 'string') {
    throw new Error(
      'short uuid is not a string. Something has gone terribly wrong'
    );
  }
  return result;
};
