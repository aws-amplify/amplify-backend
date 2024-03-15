import { Options, execa } from 'execa';

export type PublishOptions = {
  /**
   * Publish defaults to creating git tags for the packages being published.
   * Set false to disable this behavior
   */
  includeGitTags?: boolean;
  /**
   * Defaults to publishing to the public npm registry
   * Set true to publish to the local registry
   */
  useLocalRegistry?: boolean;
  /**
   * Defaults to publishing a usual release.
   * Set true to publish a snapshot.
   * See https://github.com/changesets/changesets/blob/main/docs/snapshot-releases.md
   */
  snapshotRelease?: boolean;
  /**
   * A release tag. Required for snapshot releases.
   */
  tag?: string;
};

const publishDefaults: PublishOptions = {
  includeGitTags: true,
  useLocalRegistry: false,
  snapshotRelease: false,
};
/**
 * Wrapper around `changeset publish` that exposes a few config options
 * To keep behavior consistent, this wrapper should be the ONLY path by which we execute `changeset publish`
 */
export const runPublish = async (props?: PublishOptions) => {
  const { includeGitTags, useLocalRegistry, snapshotRelease, tag } = {
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
