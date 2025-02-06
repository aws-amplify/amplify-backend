import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { v5 as uuidV5 } from 'uuid';

const NO_ACCOUNT_ID = 'NO_ACCOUNT_ID';

// eslint-disable-next-line spellcheck/spell-checker
const AMPLIFY_CLI_UUID_NAMESPACE = '283cae3e-c611-4659-9044-6796e5d696ec'; // A random v4 UUID

/**
 * Retrieves the account ID of the user
 */
export class AccountIdFetcher {
  private accountId?: string;
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
        const accountIdBucket = Number(stsResponse.Account) / 100;
        this.accountId = uuidV5(
          accountIdBucket.toString(),
          AMPLIFY_CLI_UUID_NAMESPACE
        );
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
