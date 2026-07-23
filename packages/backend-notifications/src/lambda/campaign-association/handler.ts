// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import type { CloudFormationCustomResourceEvent } from 'aws-lambda';
import { ConnectCampaignsV2Client } from '@aws-sdk/client-connectcampaignsv2';
import { CustomerProfilesClient } from '@aws-sdk/client-customer-profiles';
import { IAMClient } from '@aws-sdk/client-iam';

import { ensureInstanceOnboarded } from './onboarding.js';
import {
  associateDomain,
  disassociateDomain,
  resolveCampaignsServiceLinkedRoleArn,
} from './integration.js';

/** Module-level clients reused across warm invocations. */
const campaigns = new ConnectCampaignsV2Client({});
const profiles = new CustomerProfilesClient({});
const iam = new IAMClient({});

/** Result the Provider framework echoes back to CloudFormation. */
/* eslint-disable @typescript-eslint/naming-convention -- CFN custom-resource
   protocol + ResourceProperties are PascalCase by contract. */
export type OnEventResult = {
  PhysicalResourceId: string;
  Data?: { [key: string]: string };
};

type Props = {
  connectInstanceId: string;
  domainName: string;
  account: string;
  region: string;
};

const readProps = (event: CloudFormationCustomResourceEvent): Props => {
  const p = event.ResourceProperties as unknown as {
    ConnectInstanceId?: string;
    DomainName?: string;
    Account?: string;
    Region?: string;
  };
  /* eslint-enable @typescript-eslint/naming-convention */
  if (!p.ConnectInstanceId || !p.DomainName || !p.Account || !p.Region) {
    throw new Error(
      'Missing required ResourceProperties: ConnectInstanceId, DomainName, Account, Region',
    );
  }
  return {
    connectInstanceId: p.ConnectInstanceId,
    domainName: p.DomainName,
    account: p.Account,
    region: p.Region,
  };
};

const physicalId = (props: Props): string =>
  `campaign-assoc:${props.connectInstanceId}:${props.domainName}`;

/**
 * CloudFormation custom-resource handler (invoked via the CDK
 * `custom-resources.Provider` framework) that associates a from-scratch Customer
 * Profiles domain with its Amazon Connect instance's Outbound Campaigns v2, so
 * Connect Journeys can target the domain's profiles WITHOUT any manual console
 * step.
 *
 * Create / Update (idempotent): onboard the instance to Outbound Campaigns v2
 * (creates the service-linked role + waits for SUCCEEDED), resolve the campaigns
 * service-linked role, then create both sides of the domain <-> campaigns
 * integration.
 *
 * Delete (best-effort): reverse both integrations, swallowing errors so a
 * partial / already-removed association never blocks stack teardown.
 *
 * Only wired by the construct in create-from-scratch mode (the construct owns
 * the instance + domain). In attach mode the existing domain's association is
 * the user's responsibility and this resource is not added.
 */
export const handler = async (
  event: CloudFormationCustomResourceEvent,
): Promise<OnEventResult> => {
  console.log('[campaign-assoc] event', {
    requestType: event.RequestType,
    logicalResourceId: event.LogicalResourceId,
  });

  const props = readProps(event);

  if (event.RequestType === 'Delete') {
    await disassociateDomain(
      { campaigns, profiles },
      {
        connectInstanceId: props.connectInstanceId,
        domainName: props.domainName,
        account: props.account,
        region: props.region,
      },
    );
    return { PhysicalResourceId: event.PhysicalResourceId };
  }

  // Create + Update: onboard (idempotent) then (re)create both integrations.
  await ensureInstanceOnboarded(campaigns, {
    connectInstanceId: props.connectInstanceId,
  });
  const roleArn = await resolveCampaignsServiceLinkedRoleArn(iam);
  await associateDomain(
    { campaigns, profiles },
    {
      connectInstanceId: props.connectInstanceId,
      domainName: props.domainName,
      roleArn,
      account: props.account,
      region: props.region,
    },
  );

  return {
    PhysicalResourceId: physicalId(props),
    Data: {
      connectInstanceId: props.connectInstanceId,
      domainName: props.domainName,
    },
  };
};
