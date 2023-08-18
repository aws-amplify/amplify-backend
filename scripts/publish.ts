import { execa } from 'execa';

const tagName = process.argv[2];
if (tagName === undefined) {
  throw new Error(
    'Specify a tag name for the publish as the first and only argument'
  );
}

// To change the registry that changeset publishes to, set the `npm_config_registry` environment variable
await execa('changeset', ['publish', '--tag', tagName], { stdio: 'inherit' });
