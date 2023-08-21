import { execa, Options } from 'execa';

const publishDefaults = {
  /**
   * Publish defaults to creating git tags for the packages being published.
   * Set false to disable this behavior
   */
  includeGitTags: true,
  /**
   * Defaults to publishing to the public npm registry
   * Set true to publish to the local registry
   */
  useLocalRegistry: false,
};

/**
 * Wrapper around `changeset publish` that exposes a few config options
 * To keep behavior consistent, this wrapper should be the ONLY path by which we execute `changeset publish`
 */
export const runPublish = async (props?: Partial<typeof publishDefaults>) => {
  const { includeGitTags, useLocalRegistry } = {
    ...publishDefaults,
    ...props,
  };
  const changesetArgs = ['publish'];
  if (!includeGitTags) {
    changesetArgs.push('--no-git-tag');
  }

  const execaOptions: Options = {
    stdio: 'inherit',
    ...(useLocalRegistry
      ? { env: { npm_config_registry: 'http://localhost:4873/' } }
      : {}),
  };
  await execa('changeset', changesetArgs, execaOptions);
};

await runPublish();
