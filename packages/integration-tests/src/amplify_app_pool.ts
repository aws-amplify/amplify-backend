import {
  AmplifyClient,
  App,
  Branch,
  CreateAppCommand,
  CreateBranchCommand,
  DeleteBranchCommand,
  GetBranchCommand,
  ListAppsCommand,
  ListAppsCommandOutput,
  ListBranchesCommand,
  ListBranchesCommandOutput,
} from '@aws-sdk/client-amplify';
import { shortUuid } from './short_uuid.js';
import { e2eToolingClientConfig } from './e2e_tooling_client_config.js';
import { runWithRetry } from './retry.js';

export type TestBranch = {
  readonly appId: string;
  readonly branchName: string;
};

/**
 * Amplify App is an expensive resource. This type encapsulates lifecycle
 * of Amplify App related entities that we use in tests while managing a pool
 * of shared Amplify Apps in the test account.
 */
export type AmplifyAppPool = {
  createTestBranch: () => Promise<TestBranch>;
  fetchTestBranchDetails: (testBranch: TestBranch) => Promise<Branch>;
};

class DefaultAmplifyAppPool implements AmplifyAppPool {
  private readonly maxNumberOfAmplifyApps = 20;
  private readonly maxBranchesPerApp = 50;
  private readonly testAppPrefix = 'amplify-test-app';
  private readonly testBranchPrefix = 'testBranch';
  private readonly branchesCreated: Array<TestBranch> = [];

  constructor(private readonly amplifyClient: AmplifyClient) {
    // Register a callback that fires at the end of the current process lifetime
    // and attempts to clean up branches created in this session.
    process.once(
      'beforeExit',
      () => void this.tryCleanupBranchesCreatedByThisPool()
    );
  }

  fetchTestBranchDetails = async (testBranch: TestBranch): Promise<Branch> => {
    return this.retryableOperation(async () => {
      const branch = (
        await this.amplifyClient.send(
          new GetBranchCommand({
            appId: testBranch.appId,
            branchName: testBranch.branchName,
          })
        )
      ).branch;
      if (!branch) {
        throw new Error(
          `Failed to retrieve ${testBranch.branchName} branch of app ${testBranch.appId}`
        );
      }
      return branch;
    });
  };

  createTestBranch = async (): Promise<TestBranch> => {
    return this.retryableOperation(async () => {
      const app = await this.getAppWithCapacity();
      const branch = (
        await this.amplifyClient.send(
          new CreateBranchCommand({
            branchName: `${this.testBranchPrefix}${shortUuid()}`,
            appId: app.appId,
          })
        )
      ).branch;
      if (app.appId && branch?.branchName) {
        const testBranch: TestBranch = {
          appId: app.appId,
          branchName: branch.branchName,
        };
        this.branchesCreated.push(testBranch);
        return testBranch;
      }

      throw new Error('Unable to create branch');
    });
  };

  private listAllTestAmplifyApps = async (): Promise<Array<App>> => {
    let nextToken: string | undefined = undefined;
    const apps: Array<App> = [];
    do {
      const listAppsCommandOutput: ListAppsCommandOutput =
        await this.amplifyClient.send(
          new ListAppsCommand({
            maxResults: 100,
            nextToken,
          })
        );
      nextToken = listAppsCommandOutput.nextToken;
      listAppsCommandOutput.apps
        ?.filter((app: App) => app.name?.startsWith(this.testAppPrefix))
        .forEach((app: App) => {
          apps.push(app);
        });
    } while (nextToken);
    return apps;
  };

  private listAppBranches = async (appId: string): Promise<Array<Branch>> => {
    let nextToken: string | undefined = undefined;
    const branches: Array<Branch> = [];
    do {
      const listBranchesCommandOutput: ListBranchesCommandOutput =
        await this.amplifyClient.send(
          new ListBranchesCommand({
            appId,
            maxResults: 50,
            nextToken,
          })
        );
      nextToken = listBranchesCommandOutput.nextToken;
      if (listBranchesCommandOutput.branches) {
        listBranchesCommandOutput.branches.forEach((branch: Branch) => {
          branches.push(branch);
        });
      }
    } while (nextToken);
    return branches;
  };

  private getAppWithCapacity = async (): Promise<App> => {
    const existingAmplifyApps = await this.listAllTestAmplifyApps();
    for (const existingAmplifyApp of existingAmplifyApps) {
      if (existingAmplifyApp.appId) {
        const branches = await this.listAppBranches(existingAmplifyApp.appId);
        if (branches.length < this.maxBranchesPerApp) {
          return existingAmplifyApp;
        }
      }
    }

    if (existingAmplifyApps.length < this.maxNumberOfAmplifyApps) {
      const newApp = (
        await this.amplifyClient.send(
          new CreateAppCommand({
            name: `${this.testAppPrefix}-${shortUuid()}`,
          })
        )
      ).app;
      if (newApp) {
        return newApp;
      }
    }

    throw new Error(
      'Unable to get Amplify App that has capacity to create branch'
    );
  };

  private tryCleanupBranchesCreatedByThisPool = async () => {
    for (const testBranch of this.branchesCreated) {
      try {
        await this.amplifyClient.send(
          new DeleteBranchCommand({
            appId: testBranch.appId,
            branchName: testBranch.branchName,
          })
        );
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : '';
        console.log(
          `Failed to delete ${testBranch.branchName} branch of app ${testBranch.appId}. ${errorMessage}`
        );
      }
    }
  };

  private retryableOperation = <T>(operation: () => Promise<T>) => {
    return runWithRetry(
      operation,
      (error) => {
        // Add specific error conditions here that warrant a retry
        return error.message.includes('Unexpected token');
      },
      3 // maxAttempts
    );
  };
}

export const amplifyAppPool: AmplifyAppPool = new DefaultAmplifyAppPool(
  new AmplifyClient({
    ...e2eToolingClientConfig,
    maxAttempts: 5,
  })
);
