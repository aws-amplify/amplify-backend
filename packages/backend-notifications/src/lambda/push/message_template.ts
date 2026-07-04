// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  ConnectCampaignsV2Client,
  DescribeCampaignCommand,
} from '@aws-sdk/client-connectcampaignsv2';
import {
  ConnectClient,
  ListIntegrationAssociationsCommand,
} from '@aws-sdk/client-connect';
import {
  GetMessageTemplateCommand,
  ListMessageTemplatesCommand,
  QConnectClient,
  RenderMessageTemplateCommand,
} from '@aws-sdk/client-qconnect';

import {
  ACTIVE_VERSION_QUALIFIER,
  PUSH_CHANNEL_SUBTYPE,
  Q_MESSAGE_TEMPLATES_INTEGRATION_TYPE,
} from '../../constants.js';
import { debugLoggingEnabled } from '../shared/debug.js';
import {
  CampaignContext,
  ProfileTarget,
  PushChannelType,
  PushMessage,
} from './types.js';

/** Max length of a single Q Connect render attribute value. */
const MAX_ATTRIBUTE_LENGTH = 32767;

/** The AWS clients the template resolver needs. */
export type TemplateClients = {
  campaigns: ConnectCampaignsV2Client;
  connect: ConnectClient;
  qconnect: QConnectClient;
};

/**
 * A resolved Q in Connect PUSH message template for one journey run: the
 * knowledge base + the specific template id to render per profile. Produced by
 * {@link resolvePushTemplateContext} and carried on the delivery deps so
 * {@link renderProfileChannelMessages} can render personalized copy per profile.
 */
export type PushTemplateContext = {
  qconnect: QConnectClient;
  /** The discovered Q in Connect knowledge base id. */
  knowledgeBaseId: string;
  /** The PUSH message template id whose name matched the journey ActionId. */
  messageTemplateId: string;
  /** The template name (== the Custom-action block name / ActionId). */
  templateName: string;
};

/**
 * Per-container cache of `campaignId -> knowledgeBaseId`. KB discovery
 * (DescribeCampaign + ListIntegrationAssociations) is stable for a campaign's
 * lifetime, so warm Lambda invocations skip the two lookups.
 *
 * TODO(prod): unbounded (one entry per distinct campaignId per container) — cap
 * or TTL this before GA if a single container fronts many campaigns.
 */
const kbIdByCampaign = new Map<string, string>();

/** The shape we read out of a Q Connect PUSH template platform entry. */
type PlatformContent = {
  title?: string;
  body?: { content?: string };
};

/**
 * Discover the Q in Connect knowledge base backing a campaign's Connect
 * instance, caching per container:
 *
 *   CampaignId -> connectcampaignsv2 DescribeCampaign -> campaign.connectInstanceId
 *              -> connect ListIntegrationAssociations(Q_MESSAGE_TEMPLATES)
 *              -> IntegrationArn (arn:aws:wisdom:...:knowledge-base/<kbId>) -> kbId
 *
 * Returns `undefined` (never throws) when the instance id or the KB integration
 * cannot be resolved — the caller then falls back to non-templated copy. If
 * DescribeCampaign does not carry `connectInstanceId`, that is logged so the
 * real shape can be inspected.
 */
export const discoverKnowledgeBaseId = async (
  clients: Pick<TemplateClients, 'campaigns' | 'connect'>,
  campaignId: string,
): Promise<string | undefined> => {
  const cached = kbIdByCampaign.get(campaignId);
  if (cached) {
    return cached;
  }

  const describe = await clients.campaigns.send(
    new DescribeCampaignCommand({ id: campaignId }),
  );
  const instanceId = describe.campaign?.connectInstanceId;
  if (!instanceId) {
    console.warn(
      '[push] kb.discover.noInstanceId',
      JSON.stringify({
        campaignId,
        campaignKeys: Object.keys(describe.campaign ?? {}),
      }),
    );
    return undefined;
  }

  const assoc = await clients.connect.send(
    new ListIntegrationAssociationsCommand({
      InstanceId: instanceId,
      IntegrationType: Q_MESSAGE_TEMPLATES_INTEGRATION_TYPE,
    }),
  );
  // A Connect instance has at most one Q_MESSAGE_TEMPLATES binding, so page 1
  // always carries it and we don't paginate. Surface a NextToken if that ever
  // stops holding so the edge case is observable rather than a silent miss.
  if (assoc.NextToken) {
    console.warn(
      '[push] kb.discover.multiplePages',
      JSON.stringify({ campaignId, instanceId }),
    );
  }
  const integrationArn = assoc.IntegrationAssociationSummaryList?.find(
    (a) => a.IntegrationArn,
  )?.IntegrationArn;
  // Only trust a well-formed Q in Connect knowledge-base ARN
  // (arn:aws:wisdom:...:knowledge-base/<kbId>); anything else yields a garbage
  // id that would fail three calls later at render time.
  const kbId = integrationArn?.includes('knowledge-base/')
    ? integrationArn.split('/').pop()
    : undefined;

  if (!kbId) {
    console.warn(
      '[push] kb.discover.noKnowledgeBase',
      JSON.stringify({ campaignId, instanceId, integrationArn }),
    );
    return undefined;
  }

  console.log(
    '[push] kb.discover',
    JSON.stringify({ campaignId, instanceId, knowledgeBaseId: kbId }),
  );
  kbIdByCampaign.set(campaignId, kbId);
  return kbId;
};

/**
 * Find the PUSH message template in `knowledgeBaseId` whose name equals the
 * journey `actionId` (the Custom-action block name). Pages ListMessageTemplates
 * and filters client-side to `channelSubtype === PUSH`. Returns the matching
 * template id, or `undefined` when none matches.
 */
const findPushTemplateId = async (
  qconnect: QConnectClient,
  knowledgeBaseId: string,
  actionId: string,
): Promise<string | undefined> => {
  let nextToken: string | undefined;
  do {
    const res = await qconnect.send(
      new ListMessageTemplatesCommand({
        knowledgeBaseId,
        maxResults: 100,
        nextToken,
      }),
    );
    const match = res.messageTemplateSummaries?.find(
      (s) => s.channelSubtype === PUSH_CHANNEL_SUBTYPE && s.name === actionId,
    );
    if (match?.messageTemplateId) {
      return match.messageTemplateId;
    }
    nextToken = res.nextToken;
  } while (nextToken);
  return undefined;
};

/**
 * Resolve the PUSH message template for a journey run: discover the knowledge
 * base from the campaign, find the PUSH template whose name == the ActionId,
 * and confirm it has an ACTIVE version. Returns `undefined` (never throws) when
 * anything is missing — no campaign metadata, no KB integration, no matching
 * template — so the caller falls back to the non-templated per-profile copy.
 */
export const resolvePushTemplateContext = async (
  clients: TemplateClients,
  campaign: CampaignContext,
): Promise<PushTemplateContext | undefined> => {
  const campaignId = campaign.campaignId;
  const actionId = campaign.actionId;
  if (!campaignId || !actionId) {
    console.log(
      '[push] template.skip',
      JSON.stringify({
        reason: 'missing campaignId or actionId',
        campaignId: campaignId ?? null,
        actionId: actionId ?? null,
      }),
    );
    return undefined;
  }

  try {
    const knowledgeBaseId = await discoverKnowledgeBaseId(clients, campaignId);
    if (!knowledgeBaseId) {
      return undefined;
    }

    const messageTemplateId = await findPushTemplateId(
      clients.qconnect,
      knowledgeBaseId,
      actionId,
    );
    if (!messageTemplateId) {
      console.warn(
        '[push] template.noMatch',
        JSON.stringify({ knowledgeBaseId, actionId }),
      );
      return undefined;
    }

    // Confirm an ACTIVE (published) version exists; if not, still render the
    // latest content (GetMessageTemplate is diagnostic here, not a gate).
    try {
      await clients.qconnect.send(
        new GetMessageTemplateCommand({
          knowledgeBaseId,
          messageTemplateId: `${messageTemplateId}:${ACTIVE_VERSION_QUALIFIER}`,
        }),
      );
    } catch (err) {
      console.warn(
        '[push] template.noActiveVersion',
        JSON.stringify({
          knowledgeBaseId,
          messageTemplateId,
          error: err instanceof Error ? err.message : 'unknown',
        }),
      );
    }

    console.log(
      '[push] template.resolved',
      JSON.stringify({ knowledgeBaseId, messageTemplateId, actionId }),
    );
    return {
      qconnect: clients.qconnect,
      knowledgeBaseId,
      messageTemplateId,
      templateName: actionId,
    };
  } catch (err) {
    console.warn(
      '[push] template.resolveError',
      JSON.stringify({
        campaignId,
        actionId,
        error: err instanceof Error ? err.message : 'unknown',
      }),
    );
    return undefined;
  }
};

/**
 * Flatten a profile's `CustomerData` into a flat `customAttributes` map for
 * RenderMessageTemplate. Empirically only `{{Attributes.<flatKey>}}` variables
 * interpolate (from `customAttributes`); the `{{Customer.*}}` namespace does not
 * resolve here — so the profile's `firstName` and every `attributes.*` entry are
 * passed as flat custom attributes (templates reference e.g.
 * `{{Attributes.firstName}}`). Nested objects (`address`, `attributes`) are not
 * added directly; `attributes` is merged one level deep. Non-string / empty
 * values are dropped and values are capped at the render attribute-length limit.
 */
export const buildCustomAttributes = (
  customerData?: Record<string, unknown>,
): Record<string, string> => {
  const out: Record<string, string> = {};
  if (!customerData) {
    return out;
  }
  const add = (key: string, value: unknown): void => {
    if (typeof value === 'string' && value.length > 0) {
      out[key] = value.slice(0, MAX_ATTRIBUTE_LENGTH);
    }
  };
  for (const [key, value] of Object.entries(customerData)) {
    if (key === 'attributes' || key === 'address') {
      continue;
    }
    add(key, value);
  }
  const attributes = customerData.attributes;
  if (
    attributes &&
    typeof attributes === 'object' &&
    !Array.isArray(attributes)
  ) {
    // attributes sub-keys overwrite top-level keys on collision (attributes is
    // the authoritative custom-attribute store).
    for (const [key, value] of Object.entries(
      attributes as Record<string, unknown>,
    )) {
      add(key, value);
    }
  }
  return out;
};

/**
 * Detects a Handlebars placeholder the renderer left unresolved, e.g. a
 * `{{Attributes.firstName}}` var for a profile that has no `firstName`. Q Connect
 * leaves such vars LITERAL in the output (and lists them in
 * `attributesNotInterpolated`); shipping that raw text to a device is a bug, so
 * copy that still contains one is rejected and the caller falls back to default.
 */
const hasUnresolvedPlaceholder = (value: string): boolean =>
  /\{\{.*?\}\}/.test(value);

const toMessage = (content?: PlatformContent): PushMessage | undefined => {
  const title = content?.title;
  const body = content?.body?.content;
  if (
    typeof title === 'string' &&
    title.length > 0 &&
    typeof body === 'string' &&
    body.length > 0 &&
    !hasUnresolvedPlaceholder(title) &&
    !hasUnresolvedPlaceholder(body)
  ) {
    return { title, body };
  }
  return undefined;
};

/**
 * Render the resolved PUSH template for ONE profile and map the per-platform
 * copy to push channels:
 *   - `push.apns` -> `APNS` (+ `APNS_SANDBOX`)
 *   - `push.fcm`  -> `GCM`
 *
 * The profile's `CustomerData` is passed as flat `customAttributes` so
 * `{{Attributes.<key>}}` variables personalize. Returns a partial per-channel
 * map (only channels the template defines both a title and body for), or
 * `undefined` (never throws) when there is no push content or the render fails —
 * the caller then falls back to the non-templated copy for that profile.
 */
export const renderProfileChannelMessages = async (
  ctx: PushTemplateContext,
  target: ProfileTarget,
): Promise<Partial<Record<PushChannelType, PushMessage>> | undefined> => {
  const customAttributes = buildCustomAttributes(target.customerData);

  let res;
  try {
    res = await ctx.qconnect.send(
      new RenderMessageTemplateCommand({
        knowledgeBaseId: ctx.knowledgeBaseId,
        // Render the PUBLISHED version explicitly (verified: RenderMessageTemplate
        // accepts the `:$ACTIVE_VERSION` qualifier) so a later saved draft can't
        // silently change production copy.
        messageTemplateId: `${ctx.messageTemplateId}:${ACTIVE_VERSION_QUALIFIER}`,
        attributes: { customAttributes },
      }),
    );
  } catch (err) {
    console.warn(
      '[push] template.renderError',
      JSON.stringify({
        templateName: ctx.templateName,
        error: err instanceof Error ? err.message : 'unknown',
      }),
    );
    return undefined;
  }

  const content = res.content as
    | { push?: { apns?: PlatformContent; fcm?: PlatformContent } }
    | undefined;
  const push = content?.push;
  if (!push) {
    return undefined;
  }

  const apns = toMessage(push.apns);
  const fcm = toMessage(push.fcm);
  const perChannel: Partial<Record<PushChannelType, PushMessage>> = {};
  if (apns) {
    perChannel.APNS = apns;
    perChannel.APNS_SANDBOX = apns;
  }
  if (fcm) {
    perChannel.GCM = fcm;
  }

  // Operational signal only: which channels the template rendered usable copy
  // for, the (non-personal) attribute KEY names supplied, and any keys the
  // renderer left un-interpolated. The rendered title/body echo personalized
  // customer copy, so they are logged ONLY under debug logging (default-off),
  // alongside the profile id, to inspect per-profile interpolation.
  console.log(
    '[push] template.render',
    JSON.stringify({
      templateName: ctx.templateName,
      customAttributeKeys: Object.keys(customAttributes),
      apnsRendered: Boolean(apns),
      gcmRendered: Boolean(fcm),
      attributesNotInterpolated: res.attributesNotInterpolated ?? [],
    }),
  );
  if (debugLoggingEnabled()) {
    console.log(
      '[push][debug] template.render.copy',
      JSON.stringify({
        profileId: target.profileId,
        templateName: ctx.templateName,
        apns: apns ?? null,
        gcm: fcm ?? null,
      }),
    );
  }

  return Object.keys(perChannel).length > 0 ? perChannel : undefined;
};
