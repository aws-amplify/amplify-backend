import { Notice, NoticesManifest } from './notices';
import assert from 'node:assert';

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
  };
}
