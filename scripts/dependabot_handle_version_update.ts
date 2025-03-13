import { GitClient } from './components/git_client.js';
import { GithubClient } from './components/github_client.js';
import { DependabotVersionUpdateHandler } from './components/dependabot_version_update_handler.js';

const baseRef = process.argv[2];
if (baseRef === undefined) {
  throw new Error(
    'No base ref specified for handle dependabot version update check',
  );
}

const dependabotVersionUpdateHandler = new DependabotVersionUpdateHandler(
  baseRef,
  new GitClient(),
  new GithubClient(),
);

try {
  await dependabotVersionUpdateHandler.handleVersionUpdate();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
