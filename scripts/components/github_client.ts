import { getOctokit, context as ghContext } from '@actions/github';

/**
 * Client for interacting with the GitHub REST API. By default it scopes API requests to the repo it is running in.
 */
export class GithubClient {
  private readonly ghClient;

  /**
   * Initialize the client.
   * If no githubToken is specified, try to load on from the GITHUB_TOKEN environment variable
   */
  constructor(githubToken: string = loadGithubTokenFromEnvVar()) {
    this.ghClient = getOctokit(githubToken).rest;
  }

  /**
   * Create a new PR.
   *
   * head is the name of the branch in the repo to create the PR from. This method does not create the branch.
   * title is the PR title
   * body is the PR description
   *
   * returns the link to the PR and the PR number
   */
  createPullRequest = async ({
    head,
    title,
    body,
  }: {
    head: string;
    title: string;
    body: string;
  }) => {
    // use the branch that this workflow is running on as the base branch of the PR
    // note that this will not work in local testing. It must be mocked in a unit test.
    const baseBranch = ghContext.ref.replace('refs/heads/', '');

    const prResult = await this.ghClient.pulls.create({
      base: baseBranch,
      head,
      title,
      body,
      ...ghContext.repo,
    });

    return {
      pullRequestUrl: prResult.data.html_url,
      pullRequestNumber: prResult.data.number,
    };
  };

  fetchPullRequest = async (pullRequestNumber: number) => {
    const response = await this.ghClient.pulls.get({
      pull_number: pullRequestNumber,
      ...ghContext.repo,
    });
    return response.data;
  };
}

/**
 * Loads the github token from the GITHUB_TOKEN environment variable.
 * If not present, an error is thrown
 */
const loadGithubTokenFromEnvVar = () => {
  const ghToken = process.env.GITHUB_TOKEN;
  if (!ghToken) {
    throw new Error(`
      The GitHub access token must be set in the GITHUB_TOKEN environment variable.
    `);
  }
  return ghToken;
};
