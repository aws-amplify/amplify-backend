import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';

/**
 * Retrieves the account ID of the user
 */
export const getAccountId = async () => {
  const stsResponse = await new STSClient().send(
    new GetCallerIdentityCommand({})
  );
  if (stsResponse && stsResponse.Account) {
    return stsResponse.Account;
  }
  throw new Error(
    'Cannot retrieve the account Id from GetCallerIdentityCommand'
  );
};
