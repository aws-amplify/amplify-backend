import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  CustomerProfilesClient,
  MergeProfilesCommand,
  SearchProfilesCommand,
} from '@aws-sdk/client-customer-profiles';

import { mergeGuestIntoAuthed } from './merge_resolver.js';

type SentCommand = SearchProfilesCommand | MergeProfilesCommand;

/**
 * A minimal fake CustomerProfilesClient that dispatches on command type and
 * records every command it received, so the merge branches can be exercised
 * through the REAL `mergeGuestIntoAuthed` -> `findProfileId` code path (no
 * network, no SDK mocking framework).
 */
const fakeClient = (guestSearchProfileId?: string) => {
  const sent: SentCommand[] = [];
  const client = {
    send: async (command: SentCommand) => {
      sent.push(command);
      if (command instanceof SearchProfilesCommand) {
        return {
          Items: guestSearchProfileId
            ? [{ ProfileId: guestSearchProfileId }]
            : [],
        };
      }
      if (command instanceof MergeProfilesCommand) {
        return {};
      }
      throw new Error('unexpected command type');
    },
  } as unknown as CustomerProfilesClient;
  return { client, sent };
};

const mergeCommands = (sent: SentCommand[]): MergeProfilesCommand[] =>
  sent.filter(
    (c): c is MergeProfilesCommand => c instanceof MergeProfilesCommand,
  );

void describe('mergeGuestIntoAuthed', () => {
  void it('no-ops when no prior guest profile exists', async () => {
    const { client, sent } = fakeClient(undefined);

    const outcome = await mergeGuestIntoAuthed(
      client,
      'domain',
      'us-east-1:guest-identity',
      'P-authed',
    );

    assert.strictEqual(outcome.merged, false);
    // A search was attempted, but NO merge was fired.
    assert.strictEqual(mergeCommands(sent).length, 0);
  });

  void it('no-ops (idempotent) when the guest identity already resolves to the authed profile', async () => {
    // Post-merge re-run: SearchProfiles for the guest key now returns the
    // authed profile (its keys were transferred by the prior merge).
    const { client, sent } = fakeClient('P-authed');

    const outcome = await mergeGuestIntoAuthed(
      client,
      'domain',
      'us-east-1:guest-identity',
      'P-authed',
    );

    assert.strictEqual(outcome.merged, false);
    assert.strictEqual(mergeCommands(sent).length, 0);
  });

  void it('merges a distinct guest profile into the authed profile', async () => {
    const { client, sent } = fakeClient('P-guest');

    const outcome = await mergeGuestIntoAuthed(
      client,
      'domain',
      'us-east-1:guest-identity',
      'P-authed',
    );

    assert.strictEqual(outcome.merged, true);

    const merges = mergeCommands(sent);
    assert.strictEqual(merges.length, 1);
    assert.strictEqual(merges[0].input.DomainName, 'domain');
    assert.strictEqual(merges[0].input.MainProfileId, 'P-authed');
    assert.deepStrictEqual(merges[0].input.ProfileIdsToBeMerged, ['P-guest']);
  });

  void it('does not expose the guest profileId on the outcome (PII)', async () => {
    const { client } = fakeClient('P-guest');

    const outcome = await mergeGuestIntoAuthed(
      client,
      'domain',
      'us-east-1:guest-identity',
      'P-authed',
    );

    assert.deepStrictEqual(Object.keys(outcome), ['merged']);
  });
});
