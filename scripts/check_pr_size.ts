import { execa } from 'execa';

// any files that have an "EXCLUDE" string as a substring of the file path will be excluded from the size check
// note that gitignored files are already ignored
const EXCLUDE = ['package-lock.json'];

const MAX_LINES_ADDED = 200;
const MAX_LINES_REMOVED = 200;

/**
 * Checks that the diff between HEAD and the specified base ref is within the allowed number of changed lines
 */
const main = async () => {
  let baseRef = process.argv[2];
  if (baseRef === undefined) {
    console.log('No base ref specified. Defaulting to "main"');
    console.log(
      'To specify a different base, pass a git ref (tag, branch name, commit sha) as the first and only argument to the script'
    );
    baseRef = 'main';
  }

  // first collect the names of files that have been changed, so we can filter out excluded files
  const { stdout: filenameDiffOutput } = await execa('git', [
    '--no-pager',
    'diff',
    '--name-only',
    baseRef,
    'HEAD',
  ]);
  const diffFileList = filenameDiffOutput.toString().split('\n');
  const filteredList = diffFileList.filter((file) => !EXCLUDE.includes(file));

  // now run diff --shortstat on the filtered list of files
  const shortStatArgs = ['diff', '--shortstat', baseRef, 'HEAD', '--'];
  shortStatArgs.push(...filteredList);

  // shortStatOutput is a string like "3 files changed, 1 insertion(+), 3 deletions(-)"
  const { stdout: shortStatOutput } = await execa('git', shortStatArgs);
  const shortStatOutputString = shortStatOutput.toString();

  // extract the lines added and removed from the output
  let linesAdded = 0;
  let linesRemoved = 0;
  if (shortStatOutputString.includes('insertion')) {
    linesAdded = parseInt(
      shortStatOutputString.match(/(\d+)\s+insertion/)?.[1]
    );
  } else if (shortStatOutputString.includes('deletion')) {
    linesRemoved = parseInt(
      shortStatOutputString.match(/(\d+)\s+deletion/)?.[1]
    );
  }
  console.log(`Lines Added: ${linesAdded}`);
  console.log(`Lines Removed: ${linesRemoved}`);

  // check that they are within the limits
  if (linesAdded > MAX_LINES_ADDED) {
    throw new Error(`Lines added is greater than ${MAX_LINES_ADDED}`);
  } else if (linesRemoved > MAX_LINES_REMOVED) {
    throw new Error(`Lines removed is greater than ${MAX_LINES_REMOVED}`);
  }
  console.log(`This diff is within the allowed size limits`);
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
