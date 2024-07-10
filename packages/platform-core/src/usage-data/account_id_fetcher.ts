import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';

const NO_ACCOUNT_ID = '000000000000';
/**
 * Retrieves the account ID of the user
 */
export class AccountIdFetcher {
  private accountId: string | undefined;
  /**
   * constructor for AccountIdFetcher
   */
  constructor(private readonly stsClient = new STSClient()) {}
  fetch = async () => {
    if (this.accountId) {
      return this.accountId;
    }
    try {
      const stsResponse = await this.stsClient.send(
        new GetCallerIdentityCommand({})
      );
      if (stsResponse && stsResponse.Account) {
        this.accountId = stsResponse.Account;
        return this.accountId;
      }
      // We failed to get the account Id. Most likely the user doesn't have credentials
      return NO_ACCOUNT_ID;
    } catch (error) {
      // We failed to get the account Id. Most likely the user doesn't have credentials
      return NO_ACCOUNT_ID;
    }
  };
}
