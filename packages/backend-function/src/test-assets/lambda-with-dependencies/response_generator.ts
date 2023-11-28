import { v4 as uuid } from 'uuid';

/**
 * Dummy function to test building a lambda that has a 3p import
 */
export const getResponse = () => `Your uuid is ${uuid()}`;
