import { execa } from 'execa';

const main = async () => {
  const tagName = process.argv[2];
  if (tagName === undefined) {
    throw new Error(
      `Specify a tag name for the snapshot publish as the first and only argument`
    );
  }
  await execa('changeset', ['version', '--snapshot', tagName], {
    stdio: 'inherit',
  });
  await execa(
    'changeset',
    ['publish', '--snapshot', '--no-git-tag', '--tag', tagName],
    {
      stdio: 'inherit',
    }
  );
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
