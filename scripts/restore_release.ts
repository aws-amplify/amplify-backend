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

await releaseLifecycleManager.restoreRelease();
