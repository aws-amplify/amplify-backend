import { PackageLockValidator } from './components/package_lock_validator.js';

await new PackageLockValidator('package-lock.json').validate();
