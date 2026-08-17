import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  CustomerProfilesClient,
  DeleteDomainCommand,
  ListDomainItem,
  ListDomainsCommand,
  ListDomainsCommandOutput,
} from '@aws-sdk/client-customer-profiles';
import { CustomerProfilesDomainCleaner } from './customer_profiles_domain_cleaner.js';

const TEST_PROFILES_DOMAIN_PREFIX = 'amplify-notif-ir-';
const STALE_DURATION_IN_MILLISECONDS = 3 * 60 * 60 * 1000;
const now = new Date('2026-08-17T12:00:00.000Z');

/**
 * The staleness predicate of the cleanup script, so that the age decisions the cleaner makes are
 * exercised against the real rule instead of a test specific one.
 */
const isStale = (creationDate: Date | undefined): boolean | undefined => {
  if (!creationDate) {
    return;
  }
  return (
    now.getTime() - creationDate.getTime() > STALE_DURATION_IN_MILLISECONDS
  );
};

const hoursAgo = (hours: number): Date =>
  new Date(now.getTime() - hours * 60 * 60 * 1000);

const buildDomain = (
  domainName: string,
  createdAt: Date | undefined,
): ListDomainItem =>
  ({
    DomainName: domainName,
    CreatedAt: createdAt,
  }) as ListDomainItem;

const buildCustomerProfilesClient = (
  handlers: {
    listDomains?: Array<Partial<ListDomainsCommandOutput> | Error>;
    deleteDomain?: Array<object | Error>;
  } = {},
) => {
  const respond = (responses: Array<object | Error> | undefined) => {
    const response = responses?.shift();
    return response instanceof Error
      ? Promise.reject(response)
      : Promise.resolve(response ?? {});
  };
  const listDomains: Array<object | Error> = [...(handlers.listDomains ?? [])];
  const deleteDomain: Array<object | Error> = [
    ...(handlers.deleteDomain ?? []),
  ];
  const send = mock.fn((command: unknown) => {
    if (command instanceof ListDomainsCommand) {
      return respond(listDomains);
    }
    if (command instanceof DeleteDomainCommand) {
      return respond(deleteDomain);
    }
    return Promise.reject(new Error('Unexpected command'));
  });
  return {
    customerProfilesClient: { send } as unknown as CustomerProfilesClient,
    send,
  };
};

const getDeletedDomainNames = (
  send: ReturnType<typeof buildCustomerProfilesClient>['send'],
): Array<string | undefined> =>
  send.mock.calls
    .map((call) => call.arguments[0])
    .filter((command) => command instanceof DeleteDomainCommand)
    .map((command) => (command as DeleteDomainCommand).input.DomainName);

const buildCleaner = (
  client: CustomerProfilesClient,
  log: (message: string) => void = () => {},
) =>
  new CustomerProfilesDomainCleaner(
    client,
    TEST_PROFILES_DOMAIN_PREFIX,
    isStale,
    log,
  );

void describe('CustomerProfilesDomainCleaner', () => {
  void it('deletes only stale domains that carry the test prefix', async () => {
    const { customerProfilesClient, send } = buildCustomerProfilesClient({
      listDomains: [
        {
          Items: [
            buildDomain('amplify-notif-ir-e2e-stale', hoursAgo(4)),
            buildDomain('amplify-notif-ir-e2e-fresh', hoursAgo(1)),
            buildDomain(
              'amazon-connect-notifications-b40b20873a3f',
              hoursAgo(500),
            ),
            buildDomain('amazon-connect-amplify', hoursAgo(500)),
            buildDomain('amplify-retained-e2e-domain', hoursAgo(500)),
            buildDomain('production-profiles-domain', hoursAgo(500)),
          ],
        },
      ],
    });

    await buildCleaner(customerProfilesClient).deleteStaleTestDomains();

    assert.deepStrictEqual(getDeletedDomainNames(send), [
      'amplify-notif-ir-e2e-stale',
    ]);
  });

  void it('leaves a domain of unknown age alone', async () => {
    const { customerProfilesClient, send } = buildCustomerProfilesClient({
      listDomains: [
        {
          Items: [buildDomain('amplify-notif-ir-e2e-no-date', undefined)],
        },
      ],
    });

    await buildCleaner(customerProfilesClient).deleteStaleTestDomains();

    assert.deepStrictEqual(getDeletedDomainNames(send), []);
  });

  void it('deletes stale test domains of every page', async () => {
    const { customerProfilesClient, send } = buildCustomerProfilesClient({
      listDomains: [
        {
          Items: [buildDomain('amplify-notif-ir-e2e-page1', hoursAgo(4))],
          NextToken: 'next',
        },
        {
          Items: [buildDomain('amplify-notif-ir-e2e-page2', hoursAgo(5))],
        },
      ],
    });

    await buildCleaner(customerProfilesClient).deleteStaleTestDomains();

    assert.deepStrictEqual(getDeletedDomainNames(send), [
      'amplify-notif-ir-e2e-page1',
      'amplify-notif-ir-e2e-page2',
    ]);
    assert.deepStrictEqual(
      send.mock.calls
        .map((call) => call.arguments[0])
        .filter((command) => command instanceof ListDomainsCommand)
        .map((command) => (command as ListDomainsCommand).input.NextToken),
      [undefined, 'next'],
    );
  });

  void it('keeps deleting after a failed delete', async () => {
    const { customerProfilesClient, send } = buildCustomerProfilesClient({
      listDomains: [
        {
          Items: [
            buildDomain('amplify-notif-ir-e2e-first', hoursAgo(4)),
            buildDomain('amplify-notif-ir-e2e-second', hoursAgo(4)),
          ],
        },
      ],
      deleteDomain: [new Error('AccessDeniedException')],
    });
    const logMessages: Array<string> = [];

    await buildCleaner(customerProfilesClient, (message) =>
      logMessages.push(message),
    ).deleteStaleTestDomains();

    assert.deepStrictEqual(getDeletedDomainNames(send), [
      'amplify-notif-ir-e2e-first',
      'amplify-notif-ir-e2e-second',
    ]);
    assert.ok(
      logMessages.some(
        (message) =>
          message.includes('Failed to delete amplify-notif-ir-e2e-first') &&
          message.includes('AccessDeniedException'),
      ),
      `Expected the failed delete to be reported, got ${JSON.stringify(logMessages)}`,
    );
    assert.ok(
      logMessages.some((message) =>
        message.includes(
          'Successfully deleted amplify-notif-ir-e2e-second Customer Profiles domain',
        ),
      ),
      `Expected the second delete to succeed, got ${JSON.stringify(logMessages)}`,
    );
  });

  void it('sends no delete when nothing is stale', async () => {
    const { customerProfilesClient, send } = buildCustomerProfilesClient({
      listDomains: [{ Items: [] }],
    });

    await buildCleaner(customerProfilesClient).deleteStaleTestDomains();

    assert.deepStrictEqual(getDeletedDomainNames(send), []);
  });

  void it('lists stale test domains without deleting them', async () => {
    const { customerProfilesClient, send } = buildCustomerProfilesClient({
      listDomains: [
        {
          Items: [
            buildDomain('amplify-notif-ir-e2e-stale', hoursAgo(4)),
            buildDomain('amplify-retained-e2e-domain', hoursAgo(4)),
          ],
        },
      ],
    });

    const staleDomains = await buildCleaner(
      customerProfilesClient,
    ).listStaleTestDomains();

    assert.deepStrictEqual(
      staleDomains.map((domain) => domain.DomainName),
      ['amplify-notif-ir-e2e-stale'],
    );
    assert.deepStrictEqual(getDeletedDomainNames(send), []);
  });
});
