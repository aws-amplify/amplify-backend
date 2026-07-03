// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type {
  ConnectCampaignsV2Client,
  DescribeCampaignCommandInput,
} from '@aws-sdk/client-connectcampaignsv2';
import type {
  ConnectClient,
  ListIntegrationAssociationsCommandInput,
} from '@aws-sdk/client-connect';
import type {
  ListMessageTemplatesCommandInput,
  QConnectClient,
  RenderMessageTemplateCommandInput,
} from '@aws-sdk/client-qconnect';
import {
  TemplateClients,
  buildCustomAttributes,
  discoverKnowledgeBaseId,
  renderProfileChannelMessages,
  resolvePushTemplateContext,
} from './push_message_template.js';
import { CampaignContext, ProfileTarget } from './push_types.js';

const KB_ARN = 'arn:aws:wisdom:us-east-1:996099992135:knowledge-base/kb-1234';
const KB_ID = 'kb-1234';
const INSTANCE_ID = 'inst-9999';

/** Behaviour knobs for the fake Connect campaign / instance clients. */
type DiscoverSpec = {
  /** connectInstanceId returned by DescribeCampaign (omit to simulate absence). */
  instanceId?: string;
  /** IntegrationArn returned by ListIntegrationAssociations (omit for none). */
  integrationArn?: string;
  /** Records every DescribeCampaign id seen (to assert caching). */
  describeCalls?: string[];
};

const campaignsFor = (spec: DiscoverSpec): ConnectCampaignsV2Client =>
  ({
    send: (command: {
      constructor: { name: string };
      input: DescribeCampaignCommandInput;
    }): Promise<unknown> => {
      assert.equal(command.constructor.name, 'DescribeCampaignCommand');
      spec.describeCalls?.push(command.input.id ?? '');
      return Promise.resolve({
        campaign:
          spec.instanceId === undefined
            ? { id: command.input.id }
            : { id: command.input.id, connectInstanceId: spec.instanceId },
      });
    },
  }) as unknown as ConnectCampaignsV2Client;

const connectFor = (spec: DiscoverSpec): ConnectClient =>
  ({
    send: (command: {
      constructor: { name: string };
      input: ListIntegrationAssociationsCommandInput;
    }): Promise<unknown> => {
      assert.equal(
        command.constructor.name,
        'ListIntegrationAssociationsCommand',
      );
      assert.equal(command.input.InstanceId, spec.instanceId);
      assert.equal(command.input.IntegrationType, 'Q_MESSAGE_TEMPLATES');
      return Promise.resolve({
        IntegrationAssociationSummaryList: spec.integrationArn
          ? [{ IntegrationArn: spec.integrationArn }]
          : [],
      });
    },
  }) as unknown as ConnectClient;

/** Behaviour knobs for the fake QConnect (Wisdom) client. */
type QSpec = {
  /** Template summaries returned by (paged) ListMessageTemplates. */
  summaries?: Array<{
    name?: string;
    channelSubtype?: string;
    messageTemplateId?: string;
  }>;
  /** RenderMessageTemplate content payload (the `content` field). */
  renderContent?: unknown;
  /** Records the attributes RenderMessageTemplate was called with. */
  renderCalls?: RenderMessageTemplateCommandInput[];
  /** Throw from GetMessageTemplate to exercise the no-active-version path. */
  getThrows?: boolean;
};

const qconnectFor = (spec: QSpec): QConnectClient =>
  ({
    send: (command: {
      constructor: { name: string };
      input: unknown;
    }): Promise<unknown> => {
      const name = command.constructor.name;
      if (name === 'ListMessageTemplatesCommand') {
        void (command.input as ListMessageTemplatesCommandInput);
        return Promise.resolve({
          messageTemplateSummaries: spec.summaries ?? [],
        });
      }
      if (name === 'GetMessageTemplateCommand') {
        if (spec.getThrows) {
          return Promise.reject(new Error('no active version'));
        }
        return Promise.resolve({ messageTemplate: {} });
      }
      if (name === 'RenderMessageTemplateCommand') {
        spec.renderCalls?.push(
          command.input as RenderMessageTemplateCommandInput,
        );
        return Promise.resolve({
          content: spec.renderContent,
          attributesNotInterpolated: [],
        });
      }
      return Promise.reject(new Error(`unexpected ${name}`));
    },
  }) as unknown as QConnectClient;

const clients = (
  campaigns: ConnectCampaignsV2Client,
  connect: ConnectClient,
  qconnect: QConnectClient,
): TemplateClients => ({ campaigns, connect, qconnect });

const campaign = (over: Partial<CampaignContext> = {}): CampaignContext => ({
  campaignId: 'camp-1',
  actionId: 'Push Notification',
  ...over,
});

const target = (customerData?: Record<string, unknown>): ProfileTarget => ({
  profileId: 'prof-1',
  customerData,
});

void describe('buildCustomAttributes', () => {
  void it('flattens top-level string fields and merges attributes one level', () => {
    const out = buildCustomAttributes({
      firstName: 'Manual',
      lastName: 'Tester',
      address: { city: 'ignored-nested' },
      attributes: { plan: 'gold', tier: 'A' },
    });
    assert.deepEqual(out, {
      firstName: 'Manual',
      lastName: 'Tester',
      plan: 'gold',
      tier: 'A',
    });
  });

  void it('drops non-string and empty values, returns {} for undefined', () => {
    assert.deepEqual(buildCustomAttributes(undefined), {});
    assert.deepEqual(buildCustomAttributes({ a: '', b: 5, c: null, d: 'ok' }), {
      d: 'ok',
    });
  });
});

void describe('discoverKnowledgeBaseId', () => {
  void it('resolves KB id from campaign -> instance -> integration and caches', async () => {
    const describeCalls: string[] = [];
    const spec: DiscoverSpec = {
      instanceId: INSTANCE_ID,
      integrationArn: KB_ARN,
      describeCalls,
    };
    const c = clients(campaignsFor(spec), connectFor(spec), qconnectFor({}));

    const first = await discoverKnowledgeBaseId(c, 'cache-camp');
    assert.equal(first, KB_ID);
    // Second call for the same campaign is served from cache (no 2nd describe).
    const second = await discoverKnowledgeBaseId(c, 'cache-camp');
    assert.equal(second, KB_ID);
    assert.deepEqual(describeCalls, ['cache-camp']);
  });

  void it('returns undefined when DescribeCampaign lacks connectInstanceId', async () => {
    const spec: DiscoverSpec = { integrationArn: KB_ARN };
    const c = clients(campaignsFor(spec), connectFor(spec), qconnectFor({}));
    const res = await discoverKnowledgeBaseId(c, 'no-instance-camp');
    assert.equal(res, undefined);
  });

  void it('returns undefined when no Q_MESSAGE_TEMPLATES integration exists', async () => {
    const spec: DiscoverSpec = { instanceId: INSTANCE_ID };
    const c = clients(campaignsFor(spec), connectFor(spec), qconnectFor({}));
    const res = await discoverKnowledgeBaseId(c, 'no-integration-camp');
    assert.equal(res, undefined);
  });
});

void describe('resolvePushTemplateContext', () => {
  void it('resolves the PUSH template whose name matches the ActionId', async () => {
    const spec: DiscoverSpec = {
      instanceId: INSTANCE_ID,
      integrationArn: KB_ARN,
    };
    const q = qconnectFor({
      summaries: [
        { name: 'Other', channelSubtype: 'EMAIL', messageTemplateId: 'e-1' },
        {
          name: 'Push Notification',
          channelSubtype: 'PUSH',
          messageTemplateId: 'tmpl-push-1',
        },
      ],
    });
    const c = clients(campaignsFor(spec), connectFor(spec), q);
    const ctx = await resolvePushTemplateContext(c, campaign());
    assert.ok(ctx);
    assert.equal(ctx?.knowledgeBaseId, KB_ID);
    assert.equal(ctx?.messageTemplateId, 'tmpl-push-1');
    assert.equal(ctx?.templateName, 'Push Notification');
  });

  void it('ignores a same-name template on a non-PUSH channel', async () => {
    const spec: DiscoverSpec = {
      instanceId: INSTANCE_ID,
      integrationArn: KB_ARN,
    };
    const q = qconnectFor({
      summaries: [
        {
          name: 'Push Notification',
          channelSubtype: 'EMAIL',
          messageTemplateId: 'email-1',
        },
      ],
    });
    const c = clients(campaignsFor(spec), connectFor(spec), q);
    const ctx = await resolvePushTemplateContext(c, campaign());
    assert.equal(ctx, undefined);
  });

  void it('returns undefined when campaign metadata is missing', async () => {
    const spec: DiscoverSpec = {
      instanceId: INSTANCE_ID,
      integrationArn: KB_ARN,
    };
    const c = clients(campaignsFor(spec), connectFor(spec), qconnectFor({}));
    const ctx = await resolvePushTemplateContext(
      c,
      campaign({ actionId: undefined }),
    );
    assert.equal(ctx, undefined);
  });

  void it('returns undefined (no throw) when DescribeCampaign fails', async () => {
    const campaigns = {
      send: (): Promise<unknown> => Promise.reject(new Error('boom')),
    } as unknown as ConnectCampaignsV2Client;
    const c = clients(
      campaigns,
      connectFor({ instanceId: INSTANCE_ID }),
      qconnectFor({}),
    );
    const ctx = await resolvePushTemplateContext(
      c,
      campaign({ campaignId: 'err-camp' }),
    );
    assert.equal(ctx, undefined);
  });
});

void describe('renderProfileChannelMessages', () => {
  void it('renders per-platform copy and maps apns->APNS(+sandbox), fcm->GCM', async () => {
    const renderCalls: RenderMessageTemplateCommandInput[] = [];
    const q = qconnectFor({
      renderCalls,
      renderContent: {
        push: {
          apns: { title: 'Hello Manual', body: { content: 'iOS body' } },
          fcm: { title: 'Hello Manual', body: { content: 'Android body' } },
        },
      },
    });
    const ctx = {
      qconnect: q,
      knowledgeBaseId: KB_ID,
      messageTemplateId: 'tmpl-push-1',
      templateName: 'Push Notification',
    };
    const perChannel = await renderProfileChannelMessages(
      ctx,
      target({ firstName: 'Manual' }),
    );
    assert.ok(perChannel);
    assert.deepEqual(perChannel?.APNS, {
      title: 'Hello Manual',
      body: 'iOS body',
    });
    assert.deepEqual(perChannel?.APNS_SANDBOX, {
      title: 'Hello Manual',
      body: 'iOS body',
    });
    assert.deepEqual(perChannel?.GCM, {
      title: 'Hello Manual',
      body: 'Android body',
    });
    // The profile's fields are passed as flat customAttributes for
    // {{Attributes.firstName}} interpolation.
    assert.deepEqual(renderCalls[0]?.attributes, {
      customAttributes: { firstName: 'Manual' },
    });
  });

  void it('returns undefined when the template has no push content', async () => {
    const q = qconnectFor({ renderContent: { email: {} } });
    const ctx = {
      qconnect: q,
      knowledgeBaseId: KB_ID,
      messageTemplateId: 'tmpl-push-1',
      templateName: 'Push Notification',
    };
    const perChannel = await renderProfileChannelMessages(ctx, target());
    assert.equal(perChannel, undefined);
  });

  void it('returns undefined (no throw) when RenderMessageTemplate fails', async () => {
    const q = {
      send: (): Promise<unknown> => Promise.reject(new Error('render boom')),
    } as unknown as QConnectClient;
    const ctx = {
      qconnect: q,
      knowledgeBaseId: KB_ID,
      messageTemplateId: 'tmpl-push-1',
      templateName: 'Push Notification',
    };
    const perChannel = await renderProfileChannelMessages(ctx, target());
    assert.equal(perChannel, undefined);
  });
});
