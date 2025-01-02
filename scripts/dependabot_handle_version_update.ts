import { GitClient } from './components/git_client.js';
import { GithubClient } from './components/github_client.js';
import { DependabotVersionUpdateHandler } from './components/dependabot_version_update_handler.js';

const baseRef = process.argv[2];
if (baseRef === undefined) {
  throw new Error('No base ref specified for generate changeset check');
}

const headRef = process.argv[3];
if (headRef === undefined) {
  throw new Error('No head ref specified for generate changeset check');
}

const dependabotVersionUpdateHandler = new DependabotVersionUpdateHandler(
  baseRef,
  headRef,
  new GitClient(),
  new GithubClient()
);

try {
  await dependabotVersionUpdateHandler.handleVersionUpdate();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
