import { execa } from 'execa';

/**
 * Execute changeset version with optional args
 */
export const runVersion = async (
  additionalArgs: string[] = [],
  cwd?: string
) => {
  // changeset version has a bug where it gets stuck in an infinite loop if git fetch --deepen fails
  // https://github.com/changesets/changesets/issues/571

  // taking inspiration from https://github.com/changesets/changesets/pull/1045/files
  // we fetch all refs so that changesets doesn't go into the shallow clone codepath
  try {
    await execa('git', ['fetch', '--unshallow', '--no-tags'], {
      stdio: 'inherit',
      cwd,
    });
  } catch (err) {
    console.log(
      'git fetch --unshallow failed. This likely means we already have an un-shallow repo'
    );
  }

  const args = ['version', ...additionalArgs];
  await execa('changeset', args, {
    stdio: 'inherit',
    cwd,
  });
};
