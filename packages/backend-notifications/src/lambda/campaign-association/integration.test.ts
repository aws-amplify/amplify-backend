// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from 'node:test';
import assert from 'node:assert';
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
  associateDomain,
  campaignsInstanceArnOf,
  disassociateDomain,
  domainArnOf,
  resolveCampaignsServiceLinkedRoleArn,
} from './integration.js';

const ACCOUNT = '996099992135';
const REGION = 'us-east-1';
const INSTANCE_ID = '11111111-2222-3333-4444-555555555555';
const DOMAIN = 'amazon-connect-notifications-00000000';
const SLR_ARN = `arn:aws:iam::${ACCOUNT}:role/aws-service-role/connect-campaigns.amazonaws.com/AWSServiceRoleForConnectCampaigns_ABC`;

type Sent = { name: string; input: unknown };

const recorder = (
  run: (command: unknown) => unknown = () => ({}),
): { send: (c: unknown) => Promise<unknown>; sent: Sent[] } => {
  const sent: Sent[] = [];
  return {
    sent,
    send: async (command: unknown) => {
      sent.push({
        name: (command as { constructor: { name: string } }).constructor.name,
        input: (command as { input: unknown }).input,
      });
      return run(command);
    },
  };
};

void describe('domainArnOf / campaignsInstanceArnOf', () => {
  void it('formats the Customer Profiles domain ARN', () => {
    assert.strictEqual(
      domainArnOf(ACCOUNT, REGION, DOMAIN),
      `arn:aws:profile:${REGION}:${ACCOUNT}:domains/${DOMAIN}`,
    );
  });

  void it('formats the connect-campaigns instance ARN', () => {
    assert.strictEqual(
      campaignsInstanceArnOf(ACCOUNT, REGION, INSTANCE_ID),
      `arn:aws:connect-campaigns:${REGION}:${ACCOUNT}:instance/${INSTANCE_ID}`,
    );
  });
});

void describe('resolveCampaignsServiceLinkedRoleArn', () => {
  void it('returns the last (newest) role ARN under the campaigns SLR path', async () => {
    const rec = recorder(() => ({
      Roles: [
        {
          Arn: 'arn:aws:iam::x:role/aws-service-role/connect-campaigns.amazonaws.com/Old',
        },
        { Arn: SLR_ARN },
      ],
    }));
    const iam = { send: rec.send } as unknown as IAMClient;

    const arn = await resolveCampaignsServiceLinkedRoleArn(iam);

    assert.strictEqual(arn, SLR_ARN);
    assert.strictEqual(rec.sent[0].name, ListRolesCommand.name);
  });

  void it('throws when no service-linked role is found', async () => {
    const rec = recorder(() => ({ Roles: [] }));
    const iam = { send: rec.send } as unknown as IAMClient;
    await assert.rejects(
      resolveCampaignsServiceLinkedRoleArn(iam),
      /service-linked role not found/,
    );
  });
});

void describe('associateDomain', () => {
  void it('creates both the connect-instance and customer-profiles integrations', async () => {
    const campaignsRec = recorder();
    const profilesRec = recorder();
    const iamRec = recorder();

    await associateDomain(
      {
        campaigns: {
          send: campaignsRec.send,
        } as unknown as ConnectCampaignsV2Client,
        profiles: {
          send: profilesRec.send,
        } as unknown as CustomerProfilesClient,
        iam: { send: iamRec.send } as unknown as IAMClient,
      },
      {
        connectInstanceId: INSTANCE_ID,
        domainName: DOMAIN,
        roleArn: SLR_ARN,
        account: ACCOUNT,
        region: REGION,
      },
    );

    assert.strictEqual(campaignsRec.sent.length, 1);
    assert.strictEqual(
      campaignsRec.sent[0].name,
      PutConnectInstanceIntegrationCommand.name,
    );
    const campaignsInput = campaignsRec.sent[0].input as {
      connectInstanceId: string;
      integrationConfig: {
        customerProfiles: { domainArn: string; objectTypeNames: object };
      };
    };
    assert.strictEqual(campaignsInput.connectInstanceId, INSTANCE_ID);
    assert.strictEqual(
      campaignsInput.integrationConfig.customerProfiles.domainArn,
      domainArnOf(ACCOUNT, REGION, DOMAIN),
    );
    assert.deepStrictEqual(
      campaignsInput.integrationConfig.customerProfiles.objectTypeNames,
      {
        'Campaign-Email': 'Campaign-Email',
        'Campaign-SMS': 'Campaign-SMS',
        'Campaign-Telephony': 'Campaign-Telephony',
        'Campaign-Orchestration': 'Campaign-Orchestration',
      },
    );

    assert.strictEqual(profilesRec.sent.length, 1);
    assert.strictEqual(profilesRec.sent[0].name, PutIntegrationCommand.name);
    /* eslint-disable @typescript-eslint/naming-convention -- AWS SDK input shape is PascalCase. */
    const profilesInput = profilesRec.sent[0].input as {
      DomainName: string;
      Uri: string;
      RoleArn: string;
    };
    /* eslint-enable @typescript-eslint/naming-convention */
    assert.strictEqual(profilesInput.DomainName, DOMAIN);
    assert.strictEqual(
      profilesInput.Uri,
      campaignsInstanceArnOf(ACCOUNT, REGION, INSTANCE_ID),
    );
    assert.strictEqual(profilesInput.RoleArn, SLR_ARN);
  });
});

void describe('disassociateDomain', () => {
  void it('reverses both integrations AND offboards the instance', async () => {
    const campaignsRec = recorder();
    const profilesRec = recorder();

    await disassociateDomain(
      {
        campaigns: {
          send: campaignsRec.send,
        } as unknown as ConnectCampaignsV2Client,
        profiles: {
          send: profilesRec.send,
        } as unknown as CustomerProfilesClient,
      },
      {
        connectInstanceId: INSTANCE_ID,
        domainName: DOMAIN,
        account: ACCOUNT,
        region: REGION,
      },
    );

    const campaignsNames = campaignsRec.sent.map((s) => s.name);
    assert.deepStrictEqual(campaignsNames, [
      DeleteConnectInstanceIntegrationCommand.name,
      DeleteInstanceOnboardingJobCommand.name,
    ]);
    assert.deepStrictEqual(
      profilesRec.sent.map((s) => s.name),
      [DeleteIntegrationCommand.name],
    );
  });

  void it('never throws even when every delete fails (idempotent teardown)', async () => {
    const failing = recorder(() => {
      const err = new Error('gone');
      err.name = 'ResourceNotFoundException';
      throw err;
    });

    await assert.doesNotReject(
      disassociateDomain(
        {
          campaigns: {
            send: failing.send,
          } as unknown as ConnectCampaignsV2Client,
          profiles: { send: failing.send } as unknown as CustomerProfilesClient,
        },
        {
          connectInstanceId: INSTANCE_ID,
          domainName: DOMAIN,
          account: ACCOUNT,
          region: REGION,
        },
      ),
    );
    // All three deletes were attempted despite each throwing.
    assert.strictEqual(failing.sent.length, 3);
  });
});
