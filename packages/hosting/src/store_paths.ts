// CDK-free helpers for deriving the SSM / Secrets Manager namespaces used by the
// self-managed hosting value API (`secret()` / `config()`). Kept dependency-free
// (no CDK, no AWS SDK) so it can be shared by BOTH `defineHosting` (which sets the
// construct's `secretStore` / `configStore` prefixes at synth) AND the
// `ampx secret` / `ampx config` CLI (which writes the values). Sharing one source
// of truth is what guarantees the CLI write and the runtime read never drift.
import * as fs from 'fs';
import * as path from 'path';

/**
 * Derive a stable, per-project identifier for self-managed secret/config store
 * paths. Read from the project `package.json` `name` (sanitized) so it is
 * identical at CLI set-time and at deploy/runtime, and independent of the deploy
 * context (standalone vs pipeline stage). Falls back to `app`.
 * @param projectDir - absolute path to the project root (the dir with package.json).
 */
export const resolveStoreIdentifier = (projectDir: string): string => {
  let name: string | undefined;
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'),
    );
    name = typeof pkg?.name === 'string' ? pkg.name : undefined;
    // eslint-disable-next-line @aws-amplify/amplify-backend-rules/no-empty-catch
  } catch {
    // No/invalid package.json — fall back to the default identifier below.
  }
  // Strip an npm scope (`@org/`) and sanitize to SSM/Secrets-Manager-safe chars.
  const sanitized = (name ?? '')
    .replace(/^@[^/]+\//, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/^-+|-+$/g, '');
  return sanitized || 'app';
};

/**
 * Default per-kind store prefixes for self-managed hosting values, namespaced by
 * the project identifier so multiple self-managed apps in one account don't
 * collide. `@aws-blocks/hosting` normalizes the leading slash per store (SSM
 * keeps it; Secrets Manager strips it).
 * @param projectDir - absolute path to the project root.
 */
export const getHostingStorePrefixes = (
  projectDir: string,
): { secretPrefix: string; configPrefix: string } => {
  const id = resolveStoreIdentifier(projectDir);
  return {
    secretPrefix: `/amplify/hosting/${id}/secrets`,
    configPrefix: `/amplify/hosting/${id}/config`,
  };
};
