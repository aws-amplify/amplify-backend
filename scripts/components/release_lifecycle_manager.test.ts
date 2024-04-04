import { beforeEach, describe, it } from 'node:test';
import { mkdir } from 'fs/promises';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import * as path from 'path';

/**
 * This test suite is more of an integration test than a unit test.
 * It uses the real file system and git repo but mocks the GitHub API client
 * It spins up verdaccio to test updating package metadata locally
 *
 * Since all of these tests are sharing the same git tree, we're running in serial to avoid conflicts (mostly around duplicate tag names)
 */
void describe('ReleaseLifecycleManager', async () => {
  // before(async () => {
  //   await import('../start_npm_proxy.js');
  // });

  // after(async () => {
  //   await import('../stop_npm_proxy.js');
  // });

  beforeEach(async ({ name }) => {
    // create temp dir
    const shortId = randomUUID().split('-')[0];
    const nameNoSpace = name.replaceAll(/\s/, '');
    const testWorkingDir = path.join(tmpdir(), `${nameNoSpace}-${shortId}`);
    await mkdir(testWorkingDir);
    console.log(testWorkingDir);
    // initialize git repo
    // initialize mono repo packages
    // initialize changesets
    // run version and deploy
    // switch to a test branch based off of the original branch

    // publish a minor bump of @aws-amplify/backend and backend-cli
    // this should be version 999.1.0
    // await writeFile(
    //   `.changeset/${randomUUID()}.md`,
    //   amplifyBackendAndBackendCliMinorBumpChangeset
    // );
    // await runVersion();
    // await runPublish({ useLocalRegistry: true });

    // // publish another release with another minor bump of @aws-amplify/backend
    // // this should be version 999.2.0
    // await writeFile(
    //   `.changeset/${randomUUID()}.md`,
    //   amplifyBackendMinorBumpChangeset
    // );
    // await runVersion();
    // await runPublish({ useLocalRegistry: true });
  });

  void it('dummy test', () => {});

  /*
  void describe('deprecateRelease', () => {
    void it('deprecates expected versions and updates dist-tags', async () => {
      const releaseLifecycleManager = new ReleaseLifecycleManager(
        'HEAD',
        false
      );
      // deprecating the most recent release should:
      // 1. deprecate @aws-amplify/backend@999.2.0
      // 2. mark @aws-amplify/backend@999.1.0 as latest
      // 3. @aws-amplify/backend-cli should not be touched (ie latest still points to 999.1.0)
      await releaseLifecycleManager.deprecateRelease(
        'test deprecation message'
      );

      // check that the most recent release of backend has been deprecated and latest is pointed back to the previous release
      assert.equal(
        (await npmClient.getPackageVersionInfo('@aws-amplify/backend@999.2.0'))
          .deprecated,
        'test deprecation message'
      );

      assert.equal(
        (await npmClient.getPackageVersionInfo('@aws-amplify/backend@latest'))
          .version,
        '999.1.0'
      );

      // check that backend-cli is unchanged
      assert.equal(
        (
          await npmClient.getPackageVersionInfo(
            '@aws-amplify/backend-cli@999.1.0'
          )
        ).deprecated,
        undefined
      );

      assert.equal(
        (await npmClient.getPackageVersionInfo('@aws-amplify/backend@latest'))
          .version,
        '999.1.0'
      );

      // do another deprecation starting at HEAD^ to test that multiple rollbacks works as expected
    });
  });
  void describe('restoreRelease', () => {
    void it('un-deprecates expected versions and updates dist-tags', async () => {});
  });

  */
});

// const amplifyBackendMinorBumpChangeset = `
// ---
// '@aws-amplify/backend': minor
// ---

// test update to amplify backend package
// `;

// const amplifyBackendAndBackendCliMinorBumpChangeset = `
// ---
// '@aws-amplify/backend': minor
// '@aws-amplify/backend-cli': minor
// ---

// test update to amplify backend and backend-cli packages
// `;
