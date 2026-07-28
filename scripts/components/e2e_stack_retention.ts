/**
 * The hosting e2e test intentionally keeps the `main` branch of its test Amplify
 * app permanently connected, together with the backend stack that branch points
 * at (`amplify-<namespace>-main-branch-<hash>`). The stale resource sweep would
 * otherwise delete that stack while the test relies on it, leaving the next
 * hosting run failing against a stack in DELETE_IN_PROGRESS / DELETE_FAILED
 * state. This mirrors the `branchName !== 'main'` protection that branch pruning
 * already applies.
 */
const PERSISTENT_BRANCH_NAME = 'main';

/**
 * Returns true when a stack must be preserved by the stale stack sweep.
 */
export const isRetainedE2eStack = (stackName: string | undefined): boolean => {
  if (!stackName) {
    return false;
  }
  const parts = stackName.split('-');
  if (parts.length !== 5) {
    return false;
  }
  const [prefix, , name, type] = parts;
  return (
    prefix === 'amplify' && type === 'branch' && name === PERSISTENT_BRANCH_NAME
  );
};
