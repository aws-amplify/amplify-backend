// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ConnectCampaignsV2Client,
  GetInstanceOnboardingJobStatusCommand,
  StartInstanceOnboardingJobCommand,
} from '@aws-sdk/client-connectcampaignsv2';

import { ensureInstanceOnboarded } from './onboarding.js';

const INSTANCE_ID = '11111111-2222-3333-4444-555555555555';

/** Build a stub ConnectCampaignsV2Client whose `send` runs `run`. */
const stubClient = (
  run: (command: unknown) => Promise<unknown>,
): { client: ConnectCampaignsV2Client; commands: unknown[] } => {
  const commands: unknown[] = [];
  const client = {
    send: (command: unknown) => {
      commands.push(command);
      return run(command);
    },
  } as unknown as ConnectCampaignsV2Client;
  return { client, commands };
};

const noSleep = async (): Promise<void> => undefined;

void describe('ensureInstanceOnboarded', () => {
  void it('starts onboarding then resolves once status is SUCCEEDED', async () => {
    let statusCalls = 0;
    const { client, commands } = stubClient(async (command) => {
      if (command instanceof StartInstanceOnboardingJobCommand) {
        return {};
      }
      if (command instanceof GetInstanceOnboardingJobStatusCommand) {
        statusCalls++;
        return {
          connectInstanceOnboardingJobStatus: {
            status: statusCalls >= 2 ? 'SUCCEEDED' : 'IN_PROGRESS',
          },
        };
      }
      throw new Error('unexpected command');
    });

    await ensureInstanceOnboarded(client, {
      connectInstanceId: INSTANCE_ID,
      sleepFn: noSleep,
      baseDelayMs: 1,
    });

    assert.ok(
      commands[0] instanceof StartInstanceOnboardingJobCommand,
      'first call must start onboarding',
    );
    assert.strictEqual(statusCalls, 2, 'polls until SUCCEEDED');
  });

  void it('treats a start ConflictException (already onboarded) as success', async () => {
    const { client, commands } = stubClient(async (command) => {
      if (command instanceof StartInstanceOnboardingJobCommand) {
        const err = new Error('already onboarded');
        err.name = 'ConflictException';
        throw err;
      }
      throw new Error('should not poll after conflict');
    });

    await ensureInstanceOnboarded(client, {
      connectInstanceId: INSTANCE_ID,
      sleepFn: noSleep,
    });

    assert.strictEqual(commands.length, 1, 'no polling after start conflict');
  });

  void it('treats an absent job status as already-onboarded success', async () => {
    const { client } = stubClient(async (command) => {
      if (command instanceof StartInstanceOnboardingJobCommand) {
        return {};
      }
      return { connectInstanceOnboardingJobStatus: undefined };
    });

    await assert.doesNotReject(
      ensureInstanceOnboarded(client, {
        connectInstanceId: INSTANCE_ID,
        sleepFn: noSleep,
      }),
    );
  });

  void it('throws when the onboarding job reports FAILED', async () => {
    const { client } = stubClient(async (command) => {
      if (command instanceof StartInstanceOnboardingJobCommand) {
        return {};
      }
      return { connectInstanceOnboardingJobStatus: { status: 'FAILED' } };
    });

    await assert.rejects(
      ensureInstanceOnboarded(client, {
        connectInstanceId: INSTANCE_ID,
        sleepFn: noSleep,
      }),
      /FAILED/,
    );
  });

  void it('throws when onboarding never succeeds within the polling budget', async () => {
    const { client } = stubClient(async (command) => {
      if (command instanceof StartInstanceOnboardingJobCommand) {
        return {};
      }
      return { connectInstanceOnboardingJobStatus: { status: 'IN_PROGRESS' } };
    });

    await assert.rejects(
      ensureInstanceOnboarded(client, {
        connectInstanceId: INSTANCE_ID,
        sleepFn: noSleep,
        maxAttempts: 3,
        baseDelayMs: 1,
      }),
      /did not reach SUCCEEDED/,
    );
  });

  void it('propagates a non-conflict start error', async () => {
    const { client } = stubClient(async () => {
      const err = new Error('boom');
      err.name = 'AccessDeniedException';
      throw err;
    });

    await assert.rejects(
      ensureInstanceOnboarded(client, {
        connectInstanceId: INSTANCE_ID,
        sleepFn: noSleep,
      }),
      /boom/,
    );
  });
});
