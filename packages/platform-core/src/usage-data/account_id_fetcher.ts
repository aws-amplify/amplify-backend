import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';

/**
 * Retrieves the account ID of the user
 */
export class AccountIdFetcher {
  /**
   * constructor for AccountIdFetcher
   */
  constructor(private readonly stsClient = new STSClient()) {}
  fetch = async () => {
    const stsResponse = await this.stsClient.send(
      new GetCallerIdentityCommand({})
    );
    if (stsResponse && stsResponse.Account) {
      return stsResponse.Account;
    }
    throw new Error(
      'Cannot retrieve the account Id from GetCallerIdentityCommand'
    );
  };
}
