import { readFile } from 'fs/promises';
import { PushEvent } from '@octokit/webhooks-types';

/*
Reads the GitHub webhook event payload from the specified file path
Returns a true/false of whether the push event contains one and only one version bump commit
The result is returned in a form that is intended to be piped to GITHUB_OUTPUT
See https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-output-parameter
*/

const githubPushEventPayloadPath = process.argv[2];

const githubPushEventPayload = JSON.parse(
  await readFile(githubPushEventPayloadPath, 'utf-8')
) as PushEvent;

const isVersionPackagesCommit =
  githubPushEventPayload.commits.length === 1 &&
  githubPushEventPayload.commits[0].author.name.includes(
    'github-actions[bot]'
  ) &&
  githubPushEventPayload.commits[0].message.includes('Version Packages');

console.log(`is_version_packages_commit=${isVersionPackagesCommit}`);
