import { glob } from 'glob';
import path from 'path';
import { existsSync } from 'fs';
import fs from 'fs/promises';

/**
 * Removes ONLY the workspace-published packages from a verdaccio storage
 * directory, leaving every proxied third-party package cached on disk.
 *
 * This is used to keep the verdaccio proxy cache warm across CI runs (the
 * third-party dependency graph is expensive to re-proxy from the registry)
 * while still letting `publish:local` re-publish the workspace packages at the
 * same version numbers without hitting an EPUBLISHCONFLICT against a copy left
 * over from a previous run.
 *
 * Usage: tsx scripts/clean_workspace_packages_from_verdaccio_storage.ts <storageDir>
 */
const storageDir = process.argv[2];

if (!storageDir) {
  throw new Error(
    'Usage: tsx scripts/clean_workspace_packages_from_verdaccio_storage.ts <storageDir>',
  );
}

if (!existsSync(storageDir)) {
  console.log(
    `Verdaccio storage dir ${storageDir} does not exist yet; nothing to clean.`,
  );
  process.exit(0);
}

// Collect the names of packages published from this workspace (non-private).
const packageJsonPaths = await glob('packages/*/package.json', {
  absolute: true,
});
const workspacePackageNames = new Set<string>();
for (const packageJsonPath of packageJsonPaths) {
  let parsed: { name?: string; private?: boolean } | undefined;
  try {
    parsed = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
  } catch {
    // Skip unreadable/invalid package.json files.
    parsed = undefined;
  }
  if (parsed?.name && !parsed.private) {
    workspacePackageNames.add(parsed.name);
  }
}

await Promise.all(
  [...workspacePackageNames].map(async (name) => {
    // verdaccio stores each package under storage/<name> (scope included).
    const pkgDir = path.join(storageDir, name);
    await fs.rm(pkgDir, { recursive: true, force: true });
  }),
);

console.log(
  `Removed ${workspacePackageNames.size} workspace package(s) from ${storageDir}; third-party cache preserved.`,
);
