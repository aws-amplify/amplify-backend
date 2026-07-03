import fs from 'node:fs';
import path from 'path';

const LOCK_FILES = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  'bun.lock',
];

/**
 * The `projectRoot` + `depsLockFilePath` to pass to a {@link NodejsFunction}
 * whose `entry` ships inside this package.
 */
export type NodejsFunctionBundlingRoot = {
  readonly projectRoot: string;
  /** Absolute path to a lock file under `projectRoot`, or `undefined` if none. */
  readonly depsLockFilePath: string | undefined;
};

/**
 * Resolve the bundling root for a {@link NodejsFunction} whose `entry` ships
 * inside `@aws-amplify/backend`.
 *
 * `NodejsFunction` validates that BOTH the `entry` AND the dependency lock file
 * live under a common `projectRoot`. By default it derives `projectRoot` from
 * the nearest lock file found walking up from `process.cwd()`. Handlers that
 * ship inside this package (entry under `.../@aws-amplify/backend/lib`)
 * therefore break when synthesis runs from a consumer/test project whose cwd is
 * elsewhere (e.g. a workspace-linked integration-test project): the entry — and
 * often the cwd's own lock file — fall outside each other's roots and CDK
 * throws `PathNotUnderRoot`.
 *
 * Anchoring on the nearest lock file walking up from the handler's OWN directory
 * keeps `projectRoot`, `depsLockFilePath`, and `entry` mutually contained in
 * every layout — the monorepo root in local/CI dev, and the consumer's project
 * root once the package is installed under `node_modules`. Both values must be
 * passed to `NodejsFunction` so it does not fall back to cwd-based discovery for
 * the lock file.
 *
 * @param handlerDir - Absolute directory containing the bundled handler entry.
 * @param packageRootFallback - Absolute package root to use when no lock file is
 *   found above the handler (still contains the entry, so containment passes).
 */
export const resolveNodejsFunctionBundlingRoot = (
  handlerDir: string,
  packageRootFallback: string,
): NodejsFunctionBundlingRoot => {
  let current = handlerDir;
  for (;;) {
    const lock = LOCK_FILES.map((f) => path.join(current, f)).find((p) =>
      fs.existsSync(p),
    );
    if (lock) {
      return { projectRoot: current, depsLockFilePath: lock };
    }
    const parent = path.dirname(current);
    if (parent === current) {
      // No lock file anywhere above the handler — anchor to the package dir
      // (still contains the entry) and let CDK synthesize without a lock file.
      return {
        projectRoot: path.normalize(packageRootFallback),
        depsLockFilePath: undefined,
      };
    }
    current = parent;
  }
};
