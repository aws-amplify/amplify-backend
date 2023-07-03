import { execa } from 'execa';

const tagName = process.argv[2];
if (tagName === undefined) {
  throw new Error(
    `Specify a tag name for the snapshot publish as the first and only argument`
  );
}
await execa('changeset', ['version', '--snapshot', tagName], {
  stdio: 'inherit',
});
// To change the registry that changeset publishes to, set the `npm_config_registry` environment variable
await execa(
  'changeset',
  ['publish', '--snapshot', '--no-git-tag', '--tag', tagName],
  {
    stdio: 'inherit',
  }
);
