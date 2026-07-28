// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  ConnectCampaignsV2Client,
  GetInstanceOnboardingJobStatusCommand,
  StartInstanceOnboardingJobCommand,
} from '@aws-sdk/client-connectcampaignsv2';

/** Terminal + in-flight onboarding job statuses reported by the service. */
const STATUS_SUCCEEDED = 'SUCCEEDED';
const STATUS_FAILED = 'FAILED';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Names that, when thrown by StartInstanceOnboardingJob, indicate the instance
 * is ALREADY onboarded to Outbound Campaigns v2. Treated as success so the
 * custom resource is idempotent across stack updates / retried deployments.
 */
const isAlreadyOnboardedError = (err: unknown): boolean => {
  const name = (err as { name?: string })?.name ?? '';
  return name === 'ConflictException' || name === 'ResourceConflictException';
};

/**
 * Onboard an Amazon Connect instance to Outbound Campaigns v2 and wait until the
 * onboarding job reaches SUCCEEDED.
 *
 * StartInstanceOnboardingJob (with encryption disabled) auto-creates the
 * `AWSServiceRoleForConnectCampaigns_*` service-linked role, then the job runs
 * asynchronously (~20s). We poll GetInstanceOnboardingJobStatus with bounded,
 * exponentially-backed-off retries (capped ~2min) until it SUCCEEDS.
 *
 * Idempotent: if the instance is already onboarded (StartInstanceOnboardingJob
 * conflicts or the status is already SUCCEEDED / absent), this resolves without
 * error. Throws only on an explicit FAILED status or if the job never succeeds
 * within the polling budget.
 */
export const ensureInstanceOnboarded = async (
  client: ConnectCampaignsV2Client,
  opts: {
    connectInstanceId: string;
    /** Injected in tests to avoid real delays. Defaults to real setTimeout. */
    sleepFn?: (ms: number) => Promise<void>;
    /** Max polling attempts. Default 24 (~2min with capped backoff). */
    maxAttempts?: number;
    /** Base backoff in ms. Default 2000. */
    baseDelayMs?: number;
  },
): Promise<void> => {
  const {
    connectInstanceId,
    sleepFn = sleep,
    maxAttempts = 24,
    baseDelayMs = 2000,
  } = opts;

  try {
    await client.send(
      new StartInstanceOnboardingJobCommand({
        connectInstanceId,
        encryptionConfig: { enabled: false },
      }),
    );
    console.log('[campaign-assoc] onboarding job started', {
      connectInstanceId,
    });
  } catch (err) {
    if (isAlreadyOnboardedError(err)) {
      console.log(
        '[campaign-assoc] instance already onboarded (start conflict)',
        {
          connectInstanceId,
        },
      );
      return;
    }
    throw err;
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { connectInstanceOnboardingJobStatus } = await client.send(
      new GetInstanceOnboardingJobStatusCommand({ connectInstanceId }),
    );
    const status = connectInstanceOnboardingJobStatus?.status;
    const failureCode = connectInstanceOnboardingJobStatus?.failureCode;
    console.log('[campaign-assoc] onboarding status', {
      connectInstanceId,
      status: status ?? 'NONE',
      failureCode: failureCode ?? 'NONE',
      attempt,
    });

    if (status === STATUS_SUCCEEDED || status === undefined) {
      // SUCCEEDED, or no job present (already-onboarded steady state).
      return;
    }
    if (status === STATUS_FAILED) {
      throw new Error(
        `Instance onboarding to Outbound Campaigns FAILED for ${connectInstanceId}` +
          (failureCode ? ` (failureCode: ${failureCode})` : ''),
      );
    }

    const delay = Math.min(baseDelayMs * 2 ** attempt, 10000);
    await sleepFn(delay);
  }

  throw new Error(
    `Instance onboarding did not reach SUCCEEDED within the polling budget for ${connectInstanceId}`,
  );
};
