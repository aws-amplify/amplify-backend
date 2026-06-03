/**
 * Source for the Amplify cache plugin written into the user's
 * `server/plugins/_amplify-cache.mjs` before `nuxt build`. Inlined as
 * a string so it ships inside the compiled package (TypeScript only
 * copies `.ts`/`.js`, not `.mjs`).
 *
 * At runtime this plugin mounts an S3-backed driver at the `cache`
 * mount point so Nitro's `swr`/`isr` route rules and
 * `defineCachedHandler` calls share storage across Lambda containers.
 *
 * Auth uses the AWS SDK credential chain (Lambda execution role); no
 * static keys.
 *
 * Env vars set by the L3 construct:
 *   - `AMPLIFY_NITRO_CACHE_BUCKET` — S3 bucket name
 *   - `AMPLIFY_NITRO_CACHE_REGION` — bucket region
 *
 * Honours user-defined cache mounts: if anything is already mounted
 * at `cache`, this plugin no-ops so it never overrides user choice.
 */
export const NITRO_CACHE_PLUGIN_SOURCE = `import { defineNitroPlugin, useStorage } from '#imports';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

const bucket = process.env.AMPLIFY_NITRO_CACHE_BUCKET;
const region = process.env.AMPLIFY_NITRO_CACHE_REGION;

const keyToS3 = (key) => key.replace(/:/g, '/');
const log = (msg) =>
  process.stderr.write(\`[amplify-hosting:cache] \${msg}\\n\`);

const makeDriver = (client) => ({
  name: 'amplify-hosting-s3-cache',

  async hasItem(key) {
    try {
      await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: keyToS3(key) }),
      );
      return true;
    } catch (err) {
      if (err?.name === 'NotFound' || err?.name === 'NoSuchKey') return false;
      throw err;
    }
  },

  async getItem(key) {
    try {
      const res = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: keyToS3(key) }),
      );
      const body = await res.Body.transformToString();
      try {
        return JSON.parse(body);
      } catch {
        return body;
      }
    } catch (err) {
      if (err?.name === 'NoSuchKey' || err?.name === 'NotFound') return null;
      throw err;
    }
  },

  async setItem(key, value) {
    const body = typeof value === 'string' ? value : JSON.stringify(value);
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: keyToS3(key),
        Body: body,
        ContentType: 'application/json',
      }),
    );
  },

  async removeItem(key) {
    await client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: keyToS3(key) }),
    );
  },

  async getKeys(base) {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: base ? keyToS3(base) : undefined,
      }),
    );
    return (res.Contents ?? []).map((obj) => obj.Key.replace(/\\//g, ':'));
  },

  async clear(base) {
    const keys = await this.getKeys(base);
    await Promise.all(keys.map((k) => this.removeItem(k)));
  },
});

export default defineNitroPlugin((nitroApp) => {
  if (!bucket || !region) {
    log(
      'AMPLIFY_NITRO_CACHE_BUCKET / _REGION not set — cache stays in-memory ' +
        '(per-Lambda-container, not shared)',
    );
    return;
  }

  const storage = useStorage();

  // Don't override a cache mount the user has already configured.
  const existingMounts = storage.getMounts?.('cache') ?? [];
  const userOwned = existingMounts.some(
    (m) => m.driver?.name && m.driver.name !== 'memory' && m.driver.name !== 'amplify-hosting-s3-cache',
  );
  if (userOwned) {
    log(
      'cache mount already owned by user-configured driver, skipping S3 backend',
    );
    return;
  }

  const client = new S3Client({ region });
  const amplifyDriver = makeDriver(client);
  storage.mount('cache', amplifyDriver);
  log(\`mounted S3 cache backend (bucket=\${bucket})\`);

  // Plugin order in Nitro is determined by filename. Our plugin runs
  // first (the leading underscore puts \`_amplify-cache\` ahead in
  // alphabetical order), but a later user-named plugin (e.g.
  // \`zz-storage.ts\`) can rebind the \`cache\` mount AFTER we set it.
  // Without re-binding, the framework's SWR/ISR rules silently write
  // to the user's later mount instead of S3 — cache hit rate drops to
  // 0% across Lambda containers and the symptom is "SWR doesn't work
  // in production" with no error.
  //
  // We watch for displacement via Nitro's \`storage:mounts\` hook (when
  // available) and re-bind once with a one-time warning. The flag
  // prevents an infinite remount loop if the user's plugin also
  // re-asserts on the same hook.
  let warned = false;
  const remountIfDisplaced = () => {
    const mounts = storage.getMounts?.('cache') ?? [];
    const ours = mounts.some(
      (m) => m.driver?.name === 'amplify-hosting-s3-cache',
    );
    if (ours) return;
    if (!warned) {
      log(
        'cache mount was displaced after init by another plugin — re-binding S3 backend ' +
          '(set AMPLIFY_NITRO_CACHE_DISABLE=true to opt out)',
      );
      warned = true;
    }
    storage.mount('cache', amplifyDriver);
  };

  // Nitro exposes \`hooks.hook\` on the runtime app instance. Probe for
  // both the storage:mounts variant (newer Nitro) and a generic
  // \`request\` hook fallback (so we re-check at the top of each
  // request — cheap inline call, no I/O).
  if (process.env.AMPLIFY_NITRO_CACHE_DISABLE !== 'true') {
    if (nitroApp?.hooks?.hook) {
      try {
        nitroApp.hooks.hook('storage:mounts', remountIfDisplaced);
        // eslint-disable-next-line @aws-amplify/amplify-backend-rules/no-empty-catch
      } catch {
        // hook name not supported by this Nitro version — fall back to
        // the request-time check below.
      }
      try {
        nitroApp.hooks.hook('request', remountIfDisplaced);
        // eslint-disable-next-line @aws-amplify/amplify-backend-rules/no-empty-catch
      } catch {
        // ignore — best-effort
      }
    }
  }
});
`;
