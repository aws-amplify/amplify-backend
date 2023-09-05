import { randomUUID } from 'crypto';

/**
 * Generate a short UUID
 */
export const shortUuid = () => randomUUID().split('-')[-1];
