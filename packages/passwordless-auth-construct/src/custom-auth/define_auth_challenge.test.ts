import { describe, it } from 'node:test';
import { ChallengeResult } from '../types.js';
import { strictEqual } from 'node:assert';
import { defineAuthChallenge } from './define_auth_challenge.js';
import { buildDefineAuthChallengeEvent } from './event.mocks.js';

// A challenge session from Device SRP sign in.
const srpSession: ChallengeResult = {
  challengeName: 'DEVICE_SRP_AUTH',
  challengeResult: false,
};

void describe('defineAuthChallenge', () => {
  void it('returns CUSTOM_CHALLENGE if no session currently exists', async () => {
    const event = buildDefineAuthChallengeEvent();
    const updatedEvent = await defineAuthChallenge(event);
    strictEqual(updatedEvent.response.challengeName, 'CUSTOM_CHALLENGE');
    strictEqual(updatedEvent.response.failAuthentication, false);
  });

  void it('fails authentication if any previous sessions were not a custom challenge', async () => {
    const event = buildDefineAuthChallengeEvent([srpSession]);
    const updatedEvent = await defineAuthChallenge(event);
    strictEqual(updatedEvent.response.failAuthentication, true);
  });
});
