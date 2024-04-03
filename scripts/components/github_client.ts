import { getOctokit, context as ghContext } from '@actions/github';

class GithubClient {
  private readonly ghClient;
  constructor() {
    const ghToken = process.env.GITHUB_TOKEN;
    if (!ghToken) {
      throw new Error(`
        The GitHub access token must be set in the GITHUB_TOKEN environment variable.
      `);
    }
    this.ghClient = getOctokit(ghToken).rest;
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
  createPr = async ({
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
      prUrl: prResult.data.html_url,
      prNumber: prResult.data.number,
    };
  };
}

/**
 * Client for interacting with the GitHub API
 */
export const githubClient = new GithubClient();
