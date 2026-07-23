// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { IAMClient, ListRolesCommand } from '@aws-sdk/client-iam';
import {
  ConnectCampaignsV2Client,
  DeleteConnectInstanceConfigCommand,
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
  CONNECT_CAMPAIGNS_SERVICE_NAME,
  CONNECT_CAMPAIGNS_SLR_PATH_PREFIX,
} from '../../constants.js';

/** Object-type routing map supplied to both integration calls. */
const objectTypeNames = { ...CAMPAIGN_OBJECT_TYPE_NAMES };

/**
 * ARN builders hardcode the `aws` partition: Amazon Connect, Customer Profiles,
 * and Outbound Campaigns v2 are all commercial-partition-only today (not
 * available in `aws-cn` / `aws-us-gov`), so a partition parameter would be dead
 * configuration. Partition-awareness is deferred until this backend is
 * supported in another partition.
 */
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
 * (`AWSServiceRoleForConnectCampaigns*`), which StartInstanceOnboardingJob
 * auto-creates under `/aws-service-role/connect-campaigns.amazonaws.com/`.
 *
 * The role is selected by MATCHING its well-known name / path rather than by
 * list position: `ListRoles` does not contractually guarantee ordering, so
 * `roles[roles.length - 1]` could pick the wrong role if the account happens to
 * hold more than one role under the (already path-filtered) prefix. We prefer a
 * role whose `RoleName` starts with `AWSServiceRoleForConnectCampaigns` or whose
 * `Path` contains the `connect-campaigns.amazonaws.com` service name, and fall
 * back to the last entry only when nothing matches, so a future SLR naming
 * change degrades safely instead of throwing.
 */
export const resolveCampaignsServiceLinkedRoleArn = async (
  iam: IAMClient,
): Promise<string> => {
  const { Roles: roles } = await iam.send(
    new ListRolesCommand({ PathPrefix: CONNECT_CAMPAIGNS_SLR_PATH_PREFIX }),
  );
  const candidates = roles ?? [];
  const match =
    candidates.find(
      (role) =>
        role.RoleName?.startsWith('AWSServiceRoleForConnectCampaigns') ===
          true || role.Path?.includes(CONNECT_CAMPAIGNS_SERVICE_NAME) === true,
    ) ?? candidates[candidates.length - 1];
  const arn = match?.Arn;
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
 *   3. connectcampaignsv2:DeleteInstanceOnboardingJob (delete the onboarding
 *      job record — harmless bookkeeping cleanup, does NOT offboard)
 *   4. connectcampaignsv2:DeleteConnectInstanceConfig (the TRUE offboard: prunes
 *      the instance ARN from the account-shared managed EventBridge rule).
 *      Without this the ARN leaks on every teardown and eventually trips
 *      EVENT_BRIDGE_MANAGED_RULE_LIMIT_EXCEEDED on the next create-mode deploy.
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

  await bestEffort('instance onboarding job delete', () =>
    campaigns.send(
      new DeleteInstanceOnboardingJobCommand({ connectInstanceId }),
    ),
  );

  // The onboarding-job delete above only removes the job *record*; it does NOT
  // offboard the instance. DeleteConnectInstanceConfig is the true inverse of
  // StartInstanceOnboardingJob — it prunes the Connect instance ARN from the
  // account-shared managed EventBridge rule. Best-effort + idempotent: a missing
  // config (ResourceNotFoundException) or in-flight state (InvalidStateException)
  // is swallowed so teardown never fails.
  await bestEffort('connect instance config delete', () =>
    campaigns.send(
      new DeleteConnectInstanceConfigCommand({
        connectInstanceId,
        campaignDeletionPolicy: 'DELETE_ALL',
      }),
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
