import { Notice, NoticesManifest } from './notices.js';
import assert from 'node:assert';
import semver from 'semver';

export type NoticesManifestValidatorProps = {
  checkLinksWithGitHubApi?: boolean;
};

/**
 * Validates the notices manifest.
 */
export class NoticesManifestValidator {
  /**
   * Creates notices manifest validator.
   */
  constructor(
    private readonly props?: NoticesManifestValidatorProps,
    private readonly _fetch = fetch
  ) {}

  validate = async (noticesManifest: NoticesManifest): Promise<void> => {
    const ids = new Set<string>();
    for (const notice of noticesManifest.currentNotices) {
      await this.validateNotice(notice);
      assert.ok(
        !ids.has(notice.id),
        `Notice ids must be unique. ${notice.id} is duplicated.`
      );
      ids.add(notice.id);
    }
  };

  private validateNotice = async (notice: Notice): Promise<void> => {
    if (notice.link) {
      const gitHubIssueLinkPattern =
        /^https:\/\/github.com\/aws-amplify\/amplify-backend\/issues\/(?<issueNumber>\d+)$/;
      const matched = notice.link.match(gitHubIssueLinkPattern);
      assert.ok(matched, `Link must match ${gitHubIssueLinkPattern.source}`);
      assert.ok(matched.groups?.issueNumber);
      assert.strictEqual(
        matched.groups?.issueNumber,
        notice.id,
        'Notice id must be equal to GitHub issue number if link is provided'
      );
      if (this.props?.checkLinksWithGitHubApi) {
        const issueNumber = matched.groups.issueNumber;
        const response = await this._fetch(
          `https://api.github.com/repos/aws-amplify/amplify-backend/issues/${issueNumber}`
        );
        assert.ok(response.ok, 'Notice link must point to valid notice');
      }
    }

    // Special validations not covered by zod schema.
    for (const predicate of notice.predicates) {
      if (predicate.type === 'packageVersion') {
        assert.ok(
          semver.validRange(predicate.versionRange),
          'Package version predicate must have a valid version range'
        );
      }
    }
  };
}
