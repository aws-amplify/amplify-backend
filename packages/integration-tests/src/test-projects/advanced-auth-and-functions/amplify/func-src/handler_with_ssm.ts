import { SSM } from '@aws-sdk/client-ssm';

/**
 * This function asserts that customer can import and use SSM client.
 * I.e. asserts that the banner we inject doesn't prevent that use case.
 */
export const handler = async () => {
  new SSM();
  return 'It is working';
};
