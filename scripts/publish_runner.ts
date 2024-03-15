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
  const options = {
    ...publishDefaults,
    ...props,
  };
  validatePublishOptions(options);

  const execaOptions: Options = {
    stdio: 'inherit',
  };

  if (options.snapshotRelease && options.tag) {
    // Snapshot releases are not allowed in pre mode.
    // Exit pre mode. This is no-op if not in pre mode.
    await execa('changeset', ['pre', 'exit'], execaOptions);
    await execa(
      'changeset',
      ['version', '--snapshot', options.tag],
      execaOptions
    );
  }

  const changesetArgs = ['publish'];
  if (!options.includeGitTags) {
    changesetArgs.push('--no-git-tag');
  }
  if (options.tag) {
    changesetArgs.push('--tag', options.tag);
  }

  const execaPublishOptions: Options = {
    stdio: 'inherit',
    ...(options.useLocalRegistry
      ? { env: { npm_config_registry: 'http://localhost:4873/' } }
      : {}),
  };
  await execa('changeset', changesetArgs, execaPublishOptions);
};

const validatePublishOptions = (options: PublishOptions) => {
  if (options.snapshotRelease && !options.tag) {
    throw new Error('Tag must be provided for snapshot release.');
  }
  if (options.tag && !options.snapshotRelease) {
    throw new Error('Tag can be used only for snapshot release.');
  }
  if (options.tag === 'latest') {
    throw new Error("A tag for release must not be 'latest'");
  }
};
