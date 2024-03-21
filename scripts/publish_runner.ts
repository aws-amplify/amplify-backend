import { ExecaChildProcess, Options, execa } from 'execa';

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
   * Publish sometimes times out due to this bug in changesets
   * https://github.com/changesets/changesets/issues/571
   * when / if that issue is resolved, this retry can hopefully be removed
   *
   * Cancel and retry publish after this number of seconds.
   * The second publish will be subject to the same timeout, but will not be retried again.
   */
  retryAfterSeconds?: number;
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

  const execaOptions: Options = {
    stdio: 'inherit',
  };

  const snapshotTag = 'test';

  if (options.snapshotRelease) {
    // Snapshot releases are not allowed in pre mode.
    // Exit pre mode. This is no-op if not in pre mode.
    await execa('changeset', ['pre', 'exit'], execaOptions);
    await execa(
      'changeset',
      ['version', '--snapshot', snapshotTag],
      execaOptions
    );
  }

  const changesetArgs = ['publish'];
  if (!options.includeGitTags) {
    changesetArgs.push('--no-git-tag');
  }
  if (options.snapshotRelease) {
    changesetArgs.push('--tag', snapshotTag);
  }

  const execaPublishOptions: Options = {
    stdio: 'inherit',
    ...(options.useLocalRegistry
      ? { env: { npm_config_registry: 'http://localhost:4873/' } }
      : {}),
  };
  const publishProcess = execa('changeset', changesetArgs, execaPublishOptions);

  if (!options.retryAfterSeconds) {
    await publishProcess;
    return;
  }
  if (!(await publishWithTimeout(publishProcess, options.retryAfterSeconds))) {
    console.log('First changeset publish failed or timed out. Retrying once.');
    const retryPublish = execa('changeset', changesetArgs, execaPublishOptions);
    await publishWithTimeout(retryPublish, options.retryAfterSeconds);
  }
};

/**
 * Utility function that will kill the publishProcess after the specified timeout.
 * @returns true if the publish process completed successfully before the timeout, or false if the publish failed or timed out.
 */
const publishWithTimeout = async (
  publishProcess: ExecaChildProcess,
  timeout: number
): Promise<boolean> => {
  try {
    await Promise.race([
      publishProcess,
      new Promise((resolve, reject) =>
        setTimeout(
          () =>
            reject(new Error('publish did not complete within the timeout')),
          timeout
        )
      ),
    ]);
    return true;
  } catch (err) {
    publishProcess.kill();
    return false;
  }
};
