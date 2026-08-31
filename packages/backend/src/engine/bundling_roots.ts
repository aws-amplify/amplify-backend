import fs from 'fs';
import path from 'path';

const lockFileNames = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  // eslint-disable-next-line spellcheck/spell-checker
  'bun.lockb',
];

export type BundlingRoots = {
  projectRoot: string;
  depsLockFilePath: string;
};

/**
 * Resolves the bundling roots for a Lambda entry file shipped with this package.
 *
 * `NodejsFunction` infers `projectRoot` from the current working directory when
 * it is not provided. Amplify constructs are synthesized from the customer
 * project directory while their Lambda entry files live inside this package, so
 * the inferred root does not contain the entry and aws-cdk-lib rejects the
 * bundling with `PathNotUnderRoot`. Deriving the roots from the entry file makes
 * bundling independent of the working directory.
 *
 * Walks up from the entry file directory to the nearest ancestor containing a
 * dependency lock file. Returns undefined when no lock file is found, in which
 * case aws-cdk-lib's default inference is used.
 */
export const resolveBundlingRoots = (
  entryPath: string,
): BundlingRoots | undefined => {
  let currentDir = path.dirname(path.resolve(entryPath));
  for (;;) {
    for (const lockFileName of lockFileNames) {
      const candidate = path.join(currentDir, lockFileName);
      if (fs.existsSync(candidate)) {
        return { projectRoot: currentDir, depsLockFilePath: candidate };
      }
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return undefined;
    }
    currentDir = parentDir;
  }
};
