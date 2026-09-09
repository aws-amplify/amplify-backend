import {
  CustomerProfilesClient,
  DeleteDomainCommand,
  ListDomainItem,
  ListDomainsCommand,
  ListDomainsCommandOutput,
} from '@aws-sdk/client-customer-profiles';

/**
 * Deletes the Customer Profiles domains that e2e tests create outside CloudFormation.
 *
 * Attach mode of `defineNotifications` points at a domain the Amplify stack does not own, so its
 * e2e tests create that domain with the SDK and delete it themselves. A run that is killed before
 * its own cleanup runs therefore leaks a billable domain that no stack deletion can ever reclaim,
 * which is what this sweep exists for.
 *
 * Every domain is matched against the test name prefix before it is deleted, so an account that
 * also holds production domains can never lose one to this sweep, independently of how the
 * cleanup role is scoped.
 */
export class CustomerProfilesDomainCleaner {
  /**
   * Creates Customer Profiles domain cleaner.
   */
  constructor(
    private readonly customerProfilesClient: CustomerProfilesClient,
    private readonly testResourcePrefix: string,
    private readonly isStale: (
      creationDate: Date | undefined,
    ) => boolean | undefined,
    private readonly log: (message: string) => void = console.log,
  ) {}

  /**
   * Lists every stale domain whose name starts with the test prefix.
   *
   * A domain without a reported creation time is never returned: an unknown age cannot be told
   * apart from a domain a running test just created.
   */
  listStaleTestDomains = async (): Promise<Array<ListDomainItem>> => {
    const staleDomains: Array<ListDomainItem> = [];
    let nextToken: string | undefined = undefined;
    do {
      const listDomainsResponse: ListDomainsCommandOutput =
        await this.customerProfilesClient.send(
          new ListDomainsCommand({
            /* eslint-disable-next-line @typescript-eslint/naming-convention --
               Customer Profiles API request shapes are PascalCase by contract. */
            NextToken: nextToken,
          }),
        );
      nextToken = listDomainsResponse.NextToken;
      for (const domain of listDomainsResponse.Items ?? []) {
        if (
          this.isTestDomain(domain.DomainName) &&
          this.isStale(domain.CreatedAt)
        ) {
          staleDomains.push(domain);
        }
      }
    } while (nextToken);
    return staleDomains;
  };

  /**
   * Deletes every stale test domain, keeping going when an individual delete fails.
   */
  deleteStaleTestDomains = async (): Promise<void> => {
    const staleDomains = await this.listStaleTestDomains();
    for (const staleDomain of staleDomains) {
      const domainName = staleDomain.DomainName;
      // The prefix is re-checked here so that a delete is impossible for a name that did not go
      // through the filter above, whatever a future caller passes in.
      if (!this.isTestDomain(domainName)) {
        continue;
      }
      try {
        await this.customerProfilesClient.send(
          /* eslint-disable-next-line @typescript-eslint/naming-convention --
             Customer Profiles API request shapes are PascalCase by contract. */
          new DeleteDomainCommand({ DomainName: domainName }),
        );
        this.log(`Successfully deleted ${domainName} Customer Profiles domain`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '';
        this.log(
          `Failed to delete ${domainName} Customer Profiles domain. ${errorMessage}`,
        );
      }
    }
  };

  private isTestDomain = (domainName: string | undefined): boolean =>
    domainName !== undefined && domainName.startsWith(this.testResourcePrefix);
}
