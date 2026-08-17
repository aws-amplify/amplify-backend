// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  CreateDomainCommand,
  CustomerProfilesClient,
  DeleteDomainCommand,
  UpdateDomainCommand,
} from '@aws-sdk/client-customer-profiles';
import { shortUuid } from '../short_uuid.js';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import {
  IdentityResolutionState,
  waitForIdentityResolutionEnabled,
} from '../customer_profiles_identity_resolution.js';

/**
 * Default name prefix for the throwaway Customer Profiles domains these tests
 * create. Deliberately distinct from the `amazon-connect-*` names the
 * notifications construct generates in create-from-scratch mode, so a sweep of
 * test-created domains can never touch a construct-owned one.
 */
export const DEFAULT_TEST_PROFILES_DOMAIN_PREFIX = 'amplify-notif-ir-e2e';

/**
 * Optional override for {@link DEFAULT_TEST_PROFILES_DOMAIN_PREFIX}. Lets a
 * local run namespace the domains it creates so its own leftovers can be
 * identified and swept independently of anything else in the account.
 */
export const ENV_TEST_PROFILES_DOMAIN_PREFIX =
  'AMPLIFY_BACKEND_TESTS_PROFILES_DOMAIN_PREFIX';

/** Profiles are expired aggressively: these domains live for minutes. */
const TEST_DOMAIN_EXPIRATION_DAYS = 1;

/**
 * Attempts to delete a domain before giving up. A domain is deleted only after
 * the CloudFormation stack that registered object types INTO it is gone, and
 * that ordering is best-effort, so the delete is retried.
 */
const DELETE_ATTEMPTS = 5;

const DELETE_BASE_DELAY_MS = 2000;

/**
 * Rule-based matching configuration used to switch Identity Resolution ON.
 *
 * The specific rule is irrelevant to what is under test — only that
 * `RuleBasedMatching.Enabled` becomes `true`. `MaxAllowedRuleLevelForMatching`,
 * `MaxAllowedRuleLevelForMerging` and `ConflictResolution` are all REQUIRED by
 * `UpdateDomain` whenever `MatchingRules` is supplied.
 */
/* eslint-disable @typescript-eslint/naming-convention -- Customer Profiles API
   request shapes are PascalCase by contract. */
const RULE_BASED_MATCHING_ON = {
  Enabled: true,
  MatchingRules: [{ Rule: ['EmailAddress'] }],
  MaxAllowedRuleLevelForMatching: 1,
  MaxAllowedRuleLevelForMerging: 1,
  ConflictResolution: { ConflictResolvingModel: 'RECENCY' as const },
};
/* eslint-enable @typescript-eslint/naming-convention */

/**
 * Every domain created by this process, so a test suite can sweep leftovers in
 * an `after` hook even if it lost the reference to the creator that made them.
 */
const createdDomains = new Set<string>();

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const isAlreadyGone = (err: unknown): boolean =>
  (err as { name?: string })?.name === 'ResourceNotFoundException';

/**
 * Delete a Customer Profiles domain, tolerating a domain that is already gone
 * and retrying while a stack that references it is still being removed.
 * @param client Customer Profiles client.
 * @param domainName The domain to delete.
 */
const deleteDomain = async (
  client: CustomerProfilesClient,
  domainName: string,
): Promise<void> => {
  for (let attempt = 1; attempt <= DELETE_ATTEMPTS; attempt++) {
    try {
      await client.send(new DeleteDomainCommand({ DomainName: domainName }));
      createdDomains.delete(domainName);
      console.log(`Deleted Customer Profiles domain ${domainName}`);
      return;
    } catch (err) {
      if (isAlreadyGone(err)) {
        createdDomains.delete(domainName);
        console.log(`Customer Profiles domain ${domainName} already deleted`);
        return;
      }
      if (attempt === DELETE_ATTEMPTS) {
        throw err;
      }
      console.warn(
        `Could not delete Customer Profiles domain ${domainName} ` +
          `(attempt ${attempt}/${DELETE_ATTEMPTS}), retrying`,
        (err as { name?: string })?.name,
      );
      await sleep(DELETE_BASE_DELAY_MS * attempt);
    }
  }
};

/**
 * Delete EVERY domain created by this process that has not been cleaned up yet.
 * Safety net for an `after` hook: a domain is billable and must never outlive
 * the test run, including when the run failed part way through.
 * @param client Customer Profiles client.
 */
export const cleanupAllCreatedProfilesDomains = async (
  client: CustomerProfilesClient = new CustomerProfilesClient(
    e2eToolingClientConfig,
  ),
): Promise<void> => {
  const remaining = [...createdDomains];
  if (remaining.length === 0) {
    return;
  }
  console.log(
    `Sweeping ${remaining.length} leftover Customer Profiles domain(s): ${JSON.stringify(remaining)}`,
  );
  const failures: string[] = [];
  for (const domainName of remaining) {
    try {
      await deleteDomain(client, domainName);
    } catch (err) {
      failures.push(domainName);
      console.error(
        `Failed to delete Customer Profiles domain ${domainName}`,
        err,
      );
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `Failed to clean up Customer Profiles domain(s): ${JSON.stringify(failures)}`,
    );
  }
};

/**
 * Creates and manages the throwaway Customer Profiles domains that the
 * attach-mode notifications e2e tests point `defineNotifications({ domainName })`
 * at.
 *
 * A domain is created directly with the SDK — NOT by CloudFormation — because
 * attach mode exists precisely for domains the Amplify stack does not own, and
 * the tests need a domain whose Identity Resolution setting is configured
 * independently of any deployment (which is what the compatibility guard reads).
 */
export class CustomerProfilesDomainCreator {
  private readonly created: string[] = [];

  /**
   * Set up a domain creator.
   * @param client Customer Profiles client, defaulting to e2e tooling credentials.
   * @param createResourceNameSuffix Suffix generator, for unique domain names.
   */
  constructor(
    private readonly client: CustomerProfilesClient = new CustomerProfilesClient(
      e2eToolingClientConfig,
    ),
    private readonly createResourceNameSuffix: () => string = shortUuid,
  ) {}

  /**
   * The prefix every domain created by this instance carries.
   * @returns The configured prefix.
   */
  static prefix = (): string =>
    process.env[ENV_TEST_PROFILES_DOMAIN_PREFIX] ??
    DEFAULT_TEST_PROFILES_DOMAIN_PREFIX;

  /**
   * Create a throwaway domain with Identity Resolution DISABLED.
   *
   * Both mechanisms are passed explicitly as disabled rather than omitted, so
   * the starting state is unambiguous even if the service changes its defaults.
   * @returns The created domain name.
   */
  createDomain = async (): Promise<string> => {
    const domainName = `${CustomerProfilesDomainCreator.prefix()}-${this.createResourceNameSuffix()}`;
    await this.client.send(
      new CreateDomainCommand({
        /* eslint-disable @typescript-eslint/naming-convention -- Customer
           Profiles API request shapes are PascalCase by contract. */
        DomainName: domainName,
        DefaultExpirationDays: TEST_DOMAIN_EXPIRATION_DAYS,
        Matching: { Enabled: false },
        RuleBasedMatching: { Enabled: false },
        /* eslint-enable @typescript-eslint/naming-convention */
      }),
    );
    this.created.push(domainName);
    createdDomains.add(domainName);
    console.log(
      `Created Customer Profiles domain ${domainName} with Identity Resolution disabled`,
    );
    return domainName;
  };

  /**
   * Turn Identity Resolution ON for a domain and wait until `GetDomain` reports
   * it, so a test can attach to a domain the deployment has to refuse.
   *
   * Rule-based matching is used because it flips `Enabled` to `true`
   * immediately, reporting `Status: PENDING` — the state the guard has to refuse
   * without waiting for the ~hour-long transition to `ACTIVE`.
   * @param domainName The domain to reconfigure.
   * @returns The observed state once the change is visible.
   */
  enableIdentityResolution = async (
    domainName: string,
  ): Promise<IdentityResolutionState> => {
    await this.client.send(
      new UpdateDomainCommand({
        /* eslint-disable @typescript-eslint/naming-convention -- Customer
           Profiles API request shapes are PascalCase by contract. */
        DomainName: domainName,
        RuleBasedMatching: RULE_BASED_MATCHING_ON,
        /* eslint-enable @typescript-eslint/naming-convention */
      }),
    );
    const state = await waitForIdentityResolutionEnabled(
      this.client,
      domainName,
    );
    console.log(
      `Enabled Identity Resolution on ${domainName}: ${JSON.stringify(state)}`,
    );
    return state;
  };

  /**
   * Delete every domain this instance created. Safe to call more than once.
   */
  cleanupResources = async (): Promise<void> => {
    const failures: string[] = [];
    // Delete in reverse creation order, mirroring AuthResourceCreator.
    for (let i = this.created.length - 1; i >= 0; i--) {
      try {
        await deleteDomain(this.client, this.created[i]);
      } catch (err) {
        failures.push(this.created[i]);
        console.error(
          `Failed to delete Customer Profiles domain ${this.created[i]}`,
          err,
        );
      }
    }
    this.created.length = 0;
    if (failures.length > 0) {
      throw new Error(
        `Failed to clean up Customer Profiles domain(s): ${JSON.stringify(failures)}`,
      );
    }
  };
}
