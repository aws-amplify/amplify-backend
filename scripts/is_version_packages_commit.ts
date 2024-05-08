import { isVersionPackagesCommit } from './components/is_version_packages_commit.js';

// print whether the push event is a version packages commit
console.log(await isVersionPackagesCommit());
