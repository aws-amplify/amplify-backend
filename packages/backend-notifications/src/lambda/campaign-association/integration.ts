// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { IAMClient, ListRolesCommand } from '@aws-sdk/client-iam';
import {
  ConnectCampaignsV2Client,
  DeleteConnectInstanceIntegrationCommand,
  DeleteInstanceOnboardingJobCommand,
  PutConnectInstanceIntegrationCommand,
} from '@aws-sdk/client-connectcampaignsv2';
import {
  CustomerProfilesClient,
  DeleteIntegrationCommand,
  PutIntegrationCommand,
} from '@aws-sdk/client-customer-profiles';

import {
  CAMPAIGN_OBJECT_TYPE_NAMES,
  CONNECT_CAMPAIGNS_SLR_PATH_PREFIX,
} from '../../constants.js';

/** Object-type routing map supplied to both integration calls. */
const objectTypeNames = { ...CAMPAIGN_OBJECT_TYPE_NAMES };

/** Customer Profiles domain ARN for a domain name in the deploy account/region. */
export const domainArnOf = (
  account: string,
  region: string,
  domainName: string,
): string => `arn:aws:profile:${region}:${account}:domains/${domainName}`;

/** connect-campaigns instance ARN used as the Customer Profiles integration Uri. */
export const campaignsInstanceArnOf = (
  account: string,
  region: string,
  connectInstanceId: string,
): string =>
  `arn:aws:connect-campaigns:${region}:${account}:instance/${connectInstanceId}`;

/**
 * Resolve the Outbound Campaigns service-linked role ARN
 * (`AWSServiceRoleForConnectCampaigns_*`), which StartInstanceOnboardingJob
 * auto-creates under `/aws-service-role/connect-campaigns.amazonaws.com/`. The
 * newest role (last in the returned list) is used, matching the empirically
 * verified recipe.
 */
export const resolveCampaignsServiceLinkedRoleArn = async (
  iam: IAMClient,
): Promise<string> => {
  const { Roles: roles } = await iam.send(
    new ListRolesCommand({ PathPrefix: CONNECT_CAMPAIGNS_SLR_PATH_PREFIX }),
  );
  const arn = roles?.[roles.length - 1]?.Arn;
  if (!arn) {
    throw new Error(
      'Outbound Campaigns service-linked role not found after onboarding',
    );
  }
  return arn;
};

/**
 * Associate the (created) Customer Profiles domain with the Connect instance's
 * Outbound Campaigns v2 so Connect Journeys can target the domain's profiles:
 *   1. connectcampaignsv2:PutConnectInstanceIntegration — binds the domain ARN.
 *   2. customer-profiles:PutIntegration — the reciprocal binding, using the
 *      campaigns service-linked role.
 * Succeeds on an EMPTY domain: `objectTypeNames` is a label/routing map to
 * BUILT-IN templates, so no object types need pre-creating.
 */
export const associateDomain = async (
  clients: {
    campaigns: ConnectCampaignsV2Client;
    profiles: CustomerProfilesClient;
    iam: IAMClient;
  },
  args: {
    connectInstanceId: string;
    domainName: string;
    roleArn: string;
    account: string;
    region: string;
  },
): Promise<void> => {
  const { campaigns, profiles } = clients;
  const { connectInstanceId, domainName, roleArn, account, region } = args;
  const domainArn = domainArnOf(account, region, domainName);

  await campaigns.send(
    new PutConnectInstanceIntegrationCommand({
      connectInstanceId,
      integrationConfig: {
        customerProfiles: { domainArn, objectTypeNames },
      },
    }),
  );
  console.log('[campaign-assoc] connect instance integration created', {
    connectInstanceId,
    domainArn,
  });

  await profiles.send(
    new PutIntegrationCommand({
      DomainName: domainName,
      Uri: campaignsInstanceArnOf(account, region, connectInstanceId),
      ObjectTypeNames: objectTypeNames,
      RoleArn: roleArn,
    }),
  );
  console.log('[campaign-assoc] customer profiles integration created', {
    domainName,
    connectInstanceId,
  });
};

/**
 * Best-effort reverse of {@link associateDomain} on stack teardown. Each step is
 * idempotent and swallows errors (logged) so a missing / already-removed
 * integration — e.g. when CloudFormation deleted the parent instance / domain
 * FIRST — NEVER fails teardown. Reverses everything onCreate did:
 *   1. connectcampaignsv2:DeleteConnectInstanceIntegration (campaigns -> domain)
 *   2. customer-profiles:DeleteIntegration (domain -> campaigns)
 *   3. connectcampaignsv2:DeleteInstanceOnboardingJob (offboard from Campaigns v2)
 *
 * The `AWSServiceRoleForConnectCampaigns_*` service-linked role is deliberately
 * NOT deleted: it is account-wide, shared across ALL Connect instances /
 * campaigns in the account, free, and harmless — deleting it could break other
 * instances still onboarded to Outbound Campaigns.
 */
export const disassociateDomain = async (
  clients: {
    campaigns: ConnectCampaignsV2Client;
    profiles: CustomerProfilesClient;
  },
  args: {
    connectInstanceId: string;
    domainName: string;
    account: string;
    region: string;
  },
): Promise<void> => {
  const { campaigns, profiles } = clients;
  const { connectInstanceId, domainName, account, region } = args;

  await bestEffort('connect instance integration delete', () =>
    campaigns.send(
      new DeleteConnectInstanceIntegrationCommand({
        connectInstanceId,
        integrationIdentifier: {
          customerProfiles: {
            domainArn: domainArnOf(account, region, domainName),
          },
        },
      }),
    ),
  );

  await bestEffort('customer profiles integration delete', () =>
    profiles.send(
      new DeleteIntegrationCommand({
        DomainName: domainName,
        Uri: campaignsInstanceArnOf(account, region, connectInstanceId),
      }),
    ),
  );

  await bestEffort('instance offboarding', () =>
    campaigns.send(
      new DeleteInstanceOnboardingJobCommand({ connectInstanceId }),
    ),
  );
};

/**
 * Run a teardown step, swallowing (and logging) any error so a partial /
 * already-removed resource never fails CloudFormation teardown.
 */
const bestEffort = async (
  label: string,
  fn: () => Promise<unknown>,
): Promise<void> => {
  try {
    await fn();
    console.log(`[campaign-assoc] ${label} ok`);
  } catch (err) {
    console.warn(`[campaign-assoc] ${label} skipped`, {
      error: (err as { name?: string })?.name ?? 'unknown',
    });
  }
};
