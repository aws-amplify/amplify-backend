import { execa } from 'execa';

const main = async () => {
  // first collect the names of files that have been changed, so we can filter out excluded files
  const { stdout: gitDiffFiles } = await execa('git', ['diff', '--name-only']);
  const updatedAPIFiles = gitDiffFiles
    .toString()
    .split('\n')
    .filter((file) => file.includes('API.md'));

  if (updatedAPIFiles.length > 0) {
    throw new Error(
      `Expected no API.md file updates but found ${updatedAPIFiles}`
    );
  }
};

main().catch((err) => {
  console.log(err);
  process.exitCode = 1;
});
