// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import type { CloudFormationCustomResourceEvent } from 'aws-lambda';
import {
  ConnectCampaignsV2Client,
  DeleteConnectInstanceConfigCommand,
  GetInstanceOnboardingJobStatusCommand,
  PutConnectInstanceIntegrationCommand,
  StartInstanceOnboardingJobCommand,
} from '@aws-sdk/client-connectcampaignsv2';
import {
  CustomerProfilesClient,
  DeleteIntegrationCommand,
  PutIntegrationCommand,
} from '@aws-sdk/client-customer-profiles';
import { IAMClient, ListRolesCommand } from '@aws-sdk/client-iam';

import { handler } from './handler.js';

const ACCOUNT = '996099992135';
const REGION = 'us-east-1';
const INSTANCE_ID = '11111111-2222-3333-4444-555555555555';
const DOMAIN = 'amazon-connect-notifications-00000000';
const SLR_ARN = `arn:aws:iam::${ACCOUNT}:role/aws-service-role/connect-campaigns.amazonaws.com/AWSServiceRoleForConnectCampaigns_ABC`;

const props = {
  ConnectInstanceId: INSTANCE_ID,
  DomainName: DOMAIN,
  Account: ACCOUNT,
  Region: REGION,
};

const baseEvent = {
  ServiceToken: 'token',
  ResponseURL: 'https://example.com',
  StackId: 'stack',
  RequestId: 'req',
  LogicalResourceId: 'CampaignAssociation',
  ResourceType: 'Custom::OutboundCampaignsDomainAssociation',
};

/** Route a mocked client `send` by the command class name. */
const route = (
  handlers: Record<string, (input: unknown) => unknown>,
): ((command: unknown) => Promise<unknown>) => {
  return async (command: unknown) => {
    const name = (command as { constructor: { name: string } }).constructor
      .name;
    const fn = handlers[name];
    if (!fn) {
      throw new Error(`unexpected command ${name}`);
    }
    return fn((command as { input: unknown }).input);
  };
};

afterEach(() => {
  mock.restoreAll();
});

void describe('campaign-association handler', () => {
  void it('onCreate: onboards, resolves the SLR, and creates both integrations', async () => {
    const campaignsSent: string[] = [];
    mock.method(
      ConnectCampaignsV2Client.prototype,
      'send',
      route({
        [StartInstanceOnboardingJobCommand.name]: () => {
          campaignsSent.push('start');
          return {};
        },
        [GetInstanceOnboardingJobStatusCommand.name]: () => ({
          connectInstanceOnboardingJobStatus: { status: 'SUCCEEDED' },
        }),
        [PutConnectInstanceIntegrationCommand.name]: () => {
          campaignsSent.push('putConnect');
          return {};
        },
      }),
    );
    let putIntegrationCalled = false;
    mock.method(
      CustomerProfilesClient.prototype,
      'send',
      route({
        [PutIntegrationCommand.name]: () => {
          putIntegrationCalled = true;
          return {};
        },
      }),
    );
    mock.method(
      IAMClient.prototype,
      'send',
      route({ [ListRolesCommand.name]: () => ({ Roles: [{ Arn: SLR_ARN }] }) }),
    );

    const result = await handler({
      ...baseEvent,
      RequestType: 'Create',
      ResourceProperties: props,
    } as unknown as CloudFormationCustomResourceEvent);

    assert.deepStrictEqual(campaignsSent, ['start', 'putConnect']);
    assert.ok(putIntegrationCalled, 'customer-profiles PutIntegration called');
    assert.strictEqual(
      result.PhysicalResourceId,
      `campaign-assoc:${INSTANCE_ID}:${DOMAIN}`,
    );
  });

  void it('onDelete: best-effort reverses integrations and never throws', async () => {
    const campaignsSent: string[] = [];
    mock.method(
      ConnectCampaignsV2Client.prototype,
      'send',
      async (command: unknown) => {
        campaignsSent.push(
          (command as { constructor: { name: string } }).constructor.name,
        );
        return {};
      },
    );
    let cpDelete = false;
    mock.method(
      CustomerProfilesClient.prototype,
      'send',
      route({
        [DeleteIntegrationCommand.name]: () => {
          cpDelete = true;
          return {};
        },
      }),
    );
    // IAM must NOT be called on delete.
    mock.method(IAMClient.prototype, 'send', async () => {
      throw new Error('IAM should not be called on delete');
    });

    const result = await handler({
      ...baseEvent,
      RequestType: 'Delete',
      PhysicalResourceId: `campaign-assoc:${INSTANCE_ID}:${DOMAIN}`,
      ResourceProperties: props,
    } as unknown as CloudFormationCustomResourceEvent);

    assert.ok(cpDelete, 'customer-profiles DeleteIntegration attempted');
    assert.strictEqual(
      campaignsSent.length,
      3,
      'delete integration + delete onboarding job + delete instance config',
    );
    assert.ok(
      campaignsSent.includes(DeleteConnectInstanceConfigCommand.name),
      'connect instance config delete (true offboard) attempted',
    );
    assert.strictEqual(
      result.PhysicalResourceId,
      `campaign-assoc:${INSTANCE_ID}:${DOMAIN}`,
    );
  });

  void it('throws when required ResourceProperties are missing', async () => {
    await assert.rejects(
      handler({
        ...baseEvent,
        RequestType: 'Create',
        ResourceProperties: { ConnectInstanceId: INSTANCE_ID },
      } as unknown as CloudFormationCustomResourceEvent),
      /Missing required ResourceProperties/,
    );
  });
});
