// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import type { CloudFormationCustomResourceEvent } from 'aws-lambda';
import {
  CustomerProfilesClient,
  GetDomainCommand,
  type GetDomainCommandOutput,
} from '@aws-sdk/client-customer-profiles';

import { awsClientConfig } from '../shared/client_config.js';
import {
  evaluateMerging,
  isRetriableGetDomainError,
  mergingEnabledMessage,
} from './check.js';

/** Module-level client reused across warm invocations. */
const profiles = new CustomerProfilesClient(awsClientConfig());

/** Result the Provider framework echoes back to CloudFormation. */
/* eslint-disable @typescript-eslint/naming-convention -- CFN custom-resource
   protocol + ResourceProperties are PascalCase by contract. */
export type OnEventResult = {
  PhysicalResourceId: string;
  Data?: { [key: string]: string };
};

const readDomainName = (event: CloudFormationCustomResourceEvent): string => {
  const props = event.ResourceProperties as unknown as {
    DomainName?: string;
  };
  /* eslint-enable @typescript-eslint/naming-convention */
  if (!props.DomainName) {
    throw new Error('Missing required ResourceProperty: DomainName');
  }
  return props.DomainName;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Total `GetDomain` attempts before giving up. A transient failure must NOT be
 * mistaken for "no merging", so exhausting the attempts FAILS the deployment
 * (fail closed) rather than passing the gate.
 *
 * The budget is deliberately generous (~15s of backoff) because this resource's
 * OWN IAM policy is frequently created or updated moments earlier in the SAME
 * CloudFormation changeset, and IAM is eventually consistent — see
 * {@link isRetriableGetDomainError}.
 */
const GET_DOMAIN_ATTEMPTS = 5;

const GET_DOMAIN_BASE_DELAY_MS = 1000;

/**
 * Fetch the domain's matching configuration, retrying transient failures with
 * exponential backoff. Any error surviving the retries propagates, which fails
 * the deployment — the check is fail-closed by design.
 * @param domainName The Customer Profiles domain to inspect.
 * @returns The `GetDomain` response.
 */
const getDomainWithRetry = async (
  domainName: string,
): Promise<GetDomainCommandOutput> => {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= GET_DOMAIN_ATTEMPTS; attempt++) {
    try {
      return await profiles.send(
        new GetDomainCommand({ DomainName: domainName }),
      );
    } catch (err) {
      lastErr = err;
      console.error('[identity-resolution-guard] GetDomain failed', {
        attempt,
        attempts: GET_DOMAIN_ATTEMPTS,
        name: (err as { name?: string })?.name,
      });
      if (attempt === GET_DOMAIN_ATTEMPTS || !isRetriableGetDomainError(err)) {
        break;
      }
      await sleep(GET_DOMAIN_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }
  throw new Error(
    `defineNotifications could not verify that Identity Resolution is disabled on Customer Profiles ` +
      `domain '${domainName}', so the deployment was stopped. ` +
      `Confirm the domain exists in this account and region and that the deployment role may call ` +
      `profile:GetDomain on it. Underlying error: ${
        (lastErr as { name?: string })?.name ?? 'unknown'
      }`,
  );
};

/**
 * CloudFormation custom-resource handler (invoked via the CDK
 * `custom-resources.Provider` framework) that GATES the deployment on the
 * attached Customer Profiles domain having Identity Resolution (profile
 * merging) DISABLED.
 *
 * Wired by the construct in ATTACH mode only, where the domain is
 * customer-owned and its matching configuration can change independently of
 * this stack. In create-from-scratch mode the construct owns the domain and
 * disables both matching mechanisms on the resource itself, so no runtime check
 * is needed.
 *
 * Create / Update: `GetDomain` (retried on transient failure) and THROW when
 * either matching mechanism is enabled, which fails the deployment with an
 * actionable message. A `GetDomain` error that survives the retries also fails
 * the deployment — the gate is fail-closed, never fail-open.
 *
 * Delete: no-op success. A domain that has since had merging enabled must never
 * block teardown of the very resources being removed.
 * @param event The CloudFormation custom-resource event.
 * @returns The physical resource id (stable across updates) and the observed
 * matching state.
 */
export const handler = async (
  event: CloudFormationCustomResourceEvent,
): Promise<OnEventResult> => {
  console.log('[identity-resolution-guard] event', {
    requestType: event.RequestType,
    logicalResourceId: event.LogicalResourceId,
  });

  if (event.RequestType === 'Delete') {
    // Never block teardown.
    return { PhysicalResourceId: event.PhysicalResourceId };
  }

  const domainName = readDomainName(event);
  const domain = await getDomainWithRetry(domainName);
  const verdict = evaluateMerging(domain);

  if (verdict.merging) {
    const message = mergingEnabledMessage(domainName, verdict);
    console.error('[identity-resolution-guard] refusing domain', {
      domainName,
      mechanism: verdict.mechanism,
      status: verdict.status,
    });
    throw new Error(message);
  }

  console.log('[identity-resolution-guard] domain accepted', { domainName });
  return {
    PhysicalResourceId: `identity-resolution-guard:${domainName}`,
    /* eslint-disable-next-line @typescript-eslint/naming-convention -- CFN Data keys are PascalCase. */
    Data: { DomainName: domainName, MergingEnabled: 'false' },
  };
};
