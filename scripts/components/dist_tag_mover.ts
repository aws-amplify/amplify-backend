import { EOL } from 'os';
import { NpmClient } from './npm_client.js';
import { releaseTagToNameAndVersion } from './release_tag_to_name_and_version.js';

type DistTagMoveAction = {
  /**
   * An NPM dist-tag
   */
  distTag: string;
  /**
   * This is a string of the form <packageName>@<version>
   */
  releaseTag: string;
};

/**
 * Handles moving npm dist-tags from one package version to another
 */
export class DistTagMover {
  /**
   * Initialize with an npmClient
   */
  constructor(private readonly npmClient: NpmClient) {}

  /**
   * Given a list of sourceReleaseTags and destReleaseTags,
   * any npm dist-tags that are pointing to a sourceReleaseTag will be moved to point to the corresponding destReleaseTag
   */
  moveDistTags = async (
    sourceReleaseTags: string[],
    destReleaseTags: string[]
  ) => {
    const moveActions: DistTagMoveAction[] = [];

    for (const sourceReleaseTag of sourceReleaseTags) {
      const { packageName, version: sourceVersion } =
        releaseTagToNameAndVersion(sourceReleaseTag);

      const { 'dist-tags': distTags } = await this.npmClient.getPackageInfo(
        sourceReleaseTag
      );

      Object.entries(distTags).forEach(([tagName, versionAtTag]) => {
        if (versionAtTag !== sourceVersion) {
          return;
        }
        const destReleaseTag = destReleaseTags.find((releaseTag) =>
          releaseTag.includes(packageName)
        );
        if (!destReleaseTag) {
          // this should never happen because of the upstream logic that resolves the corresponding versions
          throw new Error(
            `No corresponding destination release tag found for ${sourceReleaseTag}`
          );
        }
        moveActions.push({
          releaseTag: destReleaseTag,
          distTag: tagName,
        });
      });
    }

    for (const { distTag, releaseTag } of moveActions) {
      console.log(`Moving dist tag "${distTag}" to release tag ${releaseTag}`);
      await this.npmClient.setDistTag(releaseTag, distTag);
      console.log(`Done!${EOL}`);
    }
  };
}
