import { stringify as uuidStringify } from 'uuid';

/**
 * Dummy function to test building a lambda that has a 3P import
 */
export const getResponse = () => {
  // create a deterministic uuid
  const uuidBytes = [
    0x6e, 0xc0, 0xbd, 0x7f, 0x11, 0xc0, 0x43, 0xda, 0x97, 0x5e, 0x2a, 0x8a,
    0xd9, 0xeb, 0xae, 0x0b,
  ];
  return `Your uuid is ${uuidStringify(
    // eslint-disable-next-line spellcheck/spell-checker
    uuidBytes // '6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b'
  )}. TEST_SECRET env var value is ${process.env.TEST_SECRET ?? ''}. TEST_SHARED_SECRET env var value is ${process.env.TEST_SHARED_SECRET ?? ''}.`;
};
