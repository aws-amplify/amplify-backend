import { describe, it } from 'node:test';
import { getDistTagFromReleaseTag } from './get_dist_tag_from_release_tag.js';
import assert from 'node:assert';

void describe('getDistTagFromReleaseTag', () => {
  void it('defaults to latest when releaseTag is not a prerelease version', () => {
    assert.equal(
      getDistTagFromReleaseTag('@aws-amplify/backend-auth@0.5.0'),
      'latest'
    );
    assert.equal(
      getDistTagFromReleaseTag('@aws-amplify/form-generator@1.8.0'),
      'latest'
    );
    assert.equal(
      getDistTagFromReleaseTag('create-amplify@123.89.921'),
      'latest'
    );
  });

  void it('grabs expected dist tag names', () => {
    assert.equal(
      getDistTagFromReleaseTag('@aws-amplify/backend-data@0.10.0-beta.9'),
      'beta'
    );
    assert.equal(
      getDistTagFromReleaseTag(
        '@aws-amplify/model-generator@0.5.0-tag.with-dashes_and_underscores_and_123.0'
      ),
      'tag.with-dashes_and_underscores_and_123'
    );
  });
});
