import { getInput } from '@actions/core';
import { ReleaseLifecycleManager } from './components/release_lifecycle_manager.js';

const searchForReleaseStartingFrom = getInput('searchForReleaseStartingFrom', {
  required: true,
});
const useNpmRegistry = getInput('useNpmRegistry', { required: true });

const releaseLifecycleManager = new ReleaseLifecycleManager(
  searchForReleaseStartingFrom,
  useNpmRegistry === 'true'
);

try {
  await releaseLifecycleManager.restoreRelease();
} catch (err) {
  console.error(err);
  process.exitCode = 1;
}
