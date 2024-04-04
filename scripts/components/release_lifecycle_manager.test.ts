import { after, before, beforeEach, describe, it } from 'node:test';

/**
 * This test suite is more of an integration test than a unit test.
 * It uses the real file system and git repo but mocks the GitHub API client
 * It spins up verdaccio to test updating package metadata locally
 *
 * Since all of these tests are sharing the same git tree, we're running concurrently to avoid conflicts (mostly around duplicate tag names)
 */
void describe('ReleaseLifecycleManager', { concurrency: 1 }, () => {
  before(async () => {
    await import('../start_npm_proxy.js');
  });

  after(async () => {
    await import('../stop_npm_proxy.js');
  });

  beforeEach(async () => {
    // checkout test branch
    // add changeset that releases minor of package A
    // run changeset version && publish
    // add changeset that releases minor of package A and B
    // run changeset version && publish
  });
  void describe('deprecateRelease', () => {
    void it('deprecates expected versions and updates dist-tags', async () => {});

    void it('does not update dist-tags when deprecating a past release');
  });
  void describe('restoreRelease', () => {
    void it('un-deprecates expected versions and updates dist-tags', async () => {});

    void it('does not update dist-tags when restoring a past release', async () => {});
  });
});
