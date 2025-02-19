import { Notice, NoticesManifest } from './notices';
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
  constructor(private readonly props?: NoticesManifestValidatorProps) {}

  validate = async (noticesManifest: NoticesManifest): Promise<void> => {
    const links = new Set<string>();
    for (const notice of noticesManifest.currentNotices) {
      await this.validateNotice(notice);
      assert.ok(
        !links.has(notice.link),
        `Notice links must be unique. ${notice.link} is duplicated.`
      );
      links.add(notice.link);
    }
  };

  private validateNotice = async (notice: Notice): Promise<void> => {
    assert.ok(notice.title, 'Notice must have title');
    assert.ok(notice.details, 'Notice must have details');
    assert.ok(notice.link, 'Notice must have link');
    const gitHubIssueLinkPattern =
      /^https:\/\/github.com\/aws-amplify\/amplify-backend\/issues\/(?<issueNumber>\d+)$/;
    const matched = notice.link.match(gitHubIssueLinkPattern);
    assert.ok(matched, `Link must match ${gitHubIssueLinkPattern.source}`);
    assert.ok(matched.groups?.issueNumber);
    if (this.props?.checkLinksWithGitHubApi) {
      const issueNumber = matched.groups.issueNumber;
      const response = await fetch(
        `https://api.github.com/repos/aws-amplify/amplify-backend/issues/${issueNumber}`
      );
      assert.ok(response.ok);
    }

    for (const predicate of notice.predicates) {
      switch (predicate.type) {
        case 'backendComponent':
          assert.ok(
            predicate.backendComponent,
            'Backend component predicate must have backend component'
          );
          break;
        case 'packageVersion':
          assert.ok(
            predicate.packageName,
            'Package version predicate must have package name'
          );
          assert.ok(
            semver.validRange(predicate.versionRange),
            'Package version predicate must have a valid version range'
          );
          break;
      }
    }
  };
}
