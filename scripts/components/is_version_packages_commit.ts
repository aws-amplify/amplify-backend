import { PushEvent } from '@octokit/webhooks-types';
import { readFile } from 'fs/promises';

/**
 * Reads the GitHub event using the GITHUB_EVENT_PATH environment variable.
 * Expects the event payload to be a PushEvent.
 * Returns true if the push event is a version packages commit, false otherwise.
 *
 * See https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
 */
export const isVersionPackagesCommit = async () => {
  const githubPushEventPayload = JSON.parse(
    await readFile(process.env.GITHUB_EVENT_PATH!, 'utf-8')
  ) as PushEvent;

  const isVersionPackagesCommit =
    githubPushEventPayload.commits.length === 1 &&
    githubPushEventPayload.commits[0].author.name.includes(
      'github-actions[bot]'
    ) &&
    githubPushEventPayload.commits[0].message.includes('Version Packages');
  return isVersionPackagesCommit;
};
