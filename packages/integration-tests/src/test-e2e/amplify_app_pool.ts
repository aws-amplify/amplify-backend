import {
  AmplifyClient,
  App,
  Branch,
  CreateAppCommand,
  CreateBranchCommand,
  DeleteBranchCommand,
  ListAppsCommand,
  ListAppsCommandOutput,
  ListBranchesCommand,
  ListBranchesCommandOutput,
} from '@aws-sdk/client-amplify';
import { shortUuid } from '../short_uuid.js';

const amplifyClient = new AmplifyClient({
  maxAttempts: 5,
});
const maxNumberOfAmplifyApps = 20;
const maxBranchesPerApp = 50;
const testAppPrefix = 'amplify-test-app';
const testBranchPrefix = 'test-branch';
const branchesCreated: Array<TestBranch> = [];

export type TestBranch = {
  appId: string;
  branchName: string;
};

/**
 * Creates a new branch that can be used in e2e tests.
 * It uses a pool of Amplify Apps and allocates branches there.
 * If throws an error if capacity of the pool is exhausted.
 * Branch created by this function is removed at the end of life of current process
 * or if that fails by cleanup script.
 */
export const getTestBranch = async (): Promise<TestBranch> => {
  const app = await getAppWithCapacity();
  const branch = (
    await amplifyClient.send(
      new CreateBranchCommand({
        branchName: `${testBranchPrefix}-${shortUuid()}`,
        appId: app.appId,
      })
    )
  ).branch;
  if (app.appId && branch?.branchName) {
    const appAndBranch: TestBranch = {
      appId: app.appId,
      branchName: branch.branchName,
    };
    branchesCreated.push(appAndBranch);
    return appAndBranch;
  }

  throw new Error('Unable to create branch');
};

const listAllTestAmplifyApps = async (): Promise<Array<App>> => {
  let nextToken: string | undefined = undefined;
  const apps: Array<App> = [];
  do {
    const listAppsCommandOutput: ListAppsCommandOutput =
      await amplifyClient.send(
        new ListAppsCommand({
          maxResults: 100,
          nextToken,
        })
      );
    nextToken = listAppsCommandOutput.nextToken;
    listAppsCommandOutput.apps
      ?.filter((app: App) => app.name?.startsWith(testAppPrefix))
      .forEach((app: App) => {
        apps.push(app);
      });
  } while (nextToken);
  return apps;
};

const listAppBranches = async (appId: string): Promise<Array<Branch>> => {
  let nextToken: string | undefined = undefined;
  const branches: Array<Branch> = [];
  do {
    const listBranchesCommandOutput: ListBranchesCommandOutput =
      await amplifyClient.send(
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

const getAppWithCapacity = async (): Promise<App> => {
  const existingAmplifyApps = await listAllTestAmplifyApps();
  for (const existingAmplifyApp of existingAmplifyApps) {
    if (existingAmplifyApp.appId) {
      const branches = await listAppBranches(existingAmplifyApp.appId);
      if (branches.length < maxBranchesPerApp) {
        return existingAmplifyApp;
      }
    }
  }

  if (existingAmplifyApps.length < maxNumberOfAmplifyApps) {
    const newApp = (
      await amplifyClient.send(
        new CreateAppCommand({
          name: `${testAppPrefix}-${shortUuid()}`,
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

const cleanupBranches = async () => {
  for (const appAndBranch of branchesCreated) {
    try {
      await amplifyClient.send(
        new DeleteBranchCommand({
          appId: appAndBranch.appId,
          branchName: appAndBranch.branchName,
        })
      );
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : '';
      console.log(
        `Failed to delete ${appAndBranch.branchName} branch of app ${appAndBranch.appId}. ${errorMessage}`
      );
    }
  }
};

process.on('beforeExit', () => {
  void cleanupBranches();
});
