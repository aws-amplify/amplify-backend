import { Notice, NoticesManifest } from './notices.js';
import semver from 'semver';
import { AmplifyFault } from '@aws-amplify/platform-core';

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
    for (const notice of noticesManifest.notices) {
      await this.validateNotice(notice);
      if (ids.has(notice.id)) {
        throw new AmplifyFault('InvalidNoticeManifestFault', {
          message: `Notice ids must be unique. ${notice.id} is duplicated.`,
        });
      }
      ids.add(notice.id);
    }
  };

  private validateNotice = async (notice: Notice): Promise<void> => {
    if (notice.link) {
      const gitHubIssueLinkPattern =
        /^https:\/\/github.com\/aws-amplify\/amplify-backend\/issues\/(?<issueNumber>\d+)$/;
      const matched = notice.link.match(gitHubIssueLinkPattern);
      if (!matched) {
        throw new AmplifyFault('InvalidNoticeManifestFault', {
          message: `Link must match ${gitHubIssueLinkPattern.source}`,
        });
      }
      if (matched.groups?.issueNumber !== notice.id) {
        throw new AmplifyFault('InvalidNoticeManifestFault', {
          message:
            'Notice id must be equal to GitHub issue number if link is provided',
        });
      }
      if (this.props?.checkLinksWithGitHubApi) {
        const issueNumber = matched.groups.issueNumber;
        const response = await this._fetch(
          `https://api.github.com/repos/aws-amplify/amplify-backend/issues/${issueNumber}`
        );
        if (!response.ok) {
          throw new AmplifyFault('InvalidNoticeManifestFault', {
            message: 'Notice link must point to valid notice',
          });
        }
      }
    }

    // Special validations not covered by zod schema.
    for (const predicate of notice.predicates) {
      if (predicate.type === 'packageVersion') {
        if (!semver.validRange(predicate.versionRange)) {
          throw new AmplifyFault('InvalidNoticeManifestFault', {
            message:
              'Package version predicate must have a valid version range',
          });
        }
      } else if (predicate.type === 'nodeVersion') {
        if (!semver.validRange(predicate.versionRange)) {
          throw new AmplifyFault('InvalidNoticeManifestFault', {
            message: 'Node version predicate must have a valid version range',
          });
        }
      }
    }
  };
}
