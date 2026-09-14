import fsp from 'fs/promises';
import { EOL } from 'os';

/**
 * Creates a changeset file in .changeset
 */
export const createChangesetFile = async (
  filePath: string,
  frontMatterContents?: ChangesetFrontMatterContent[],
  summary?: string,
) => {
  const frontMatterArray: string[] = [];
  let content = '';

  for (const frontMatterLine of frontMatterContents ?? []) {
    frontMatterArray.push(
      `'${frontMatterLine.packageName}': ${frontMatterLine.bumpType}`,
    );
  }

  if (summary && frontMatterArray.length > 0) {
    content = `---${EOL}${frontMatterArray.join(
      EOL,
    )}${EOL}---${EOL}${EOL}${summary}${EOL}`;
  } else {
    content = `---${EOL}---${EOL}`;
  }

  await fsp.writeFile(filePath, content);
};

export type ChangesetFrontMatterContent = {
  packageName: string;
  bumpType: BumpType;
};

export enum BumpType {
  MAJOR = 'major',
  MINOR = 'minor',
  PATCH = 'patch',
  NONE = 'none',
}
