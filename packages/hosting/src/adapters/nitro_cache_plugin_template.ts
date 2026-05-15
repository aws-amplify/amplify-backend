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

export default defineNitroPlugin(() => {
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
    (m) => m.driver?.name && m.driver.name !== 'memory',
  );
  if (userOwned) {
    log(
      'cache mount already owned by user-configured driver, skipping S3 backend',
    );
    return;
  }

  const client = new S3Client({ region });
  storage.mount('cache', makeDriver(client));
  log(\`mounted S3 cache backend (bucket=\${bucket})\`);
});
`;
