/**
 * ISR Cache Handler — S3 + DynamoDB backed.
 *
 * This module ships with the SSR Lambda deployment package and is invoked
 * at runtime by the framework (e.g., Next.js) for cache get/set/revalidateTag
 * operations. It is framework-agnostic — any framework that implements the
 * CacheHandler interface can use it.
 *
 * Environment variables (injected by the CacheConstruct):
 * - CACHE_BUCKET_NAME: S3 bucket for storing cached responses
 * - CACHE_TABLE_NAME: DynamoDB table for tag→key mappings
 *
 * Architecture:
 * - GET: Check DynamoDB for stale tags, then fetch from S3
 * - SET: Write to S3 with metadata, update tag mappings in DynamoDB
 * - REVALIDATE_TAG: Mark all keys with the given tag(s) as stale in DynamoDB
 */

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import {
  DynamoDBClient,
  QueryCommand,
  BatchWriteItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';

/**
 * A cached entry returned by the cache handler.
 */
export type CacheEntry = {
  /** The cached response body (HTML, JSON, etc.). */
  body: Buffer;
  /** HTTP headers associated with the cached response. */
  headers?: Record<string, string>;
  /** HTTP status code. */
  status?: number;
  /** Revalidation period in seconds (from the original response). */
  revalidate?: number;
  /** Tags associated with this cache entry for on-demand invalidation. */
  tags?: string[];
  /** Timestamp (epoch ms) when this entry was last generated. */
  lastModified: number;
};

/**
 * Context passed to the `set` method describing how the entry should be cached.
 */
export type CacheSetContext = {
  /** Revalidation period in seconds. Undefined means cache indefinitely. */
  revalidate?: number;
  /** Tags for on-demand revalidation via `revalidateTag()`. */
  tags?: string[];
  /** HTTP status code of the response. */
  status?: number;
  /** HTTP headers to cache alongside the response body. */
  headers?: Record<string, string>;
};

/**
 * S3 object metadata keys used for cache entry metadata.
 */
const META_KEYS = {
  REVALIDATE: 'x-cache-revalidate',
  TAGS: 'x-cache-tags',
  STATUS: 'x-cache-status',
  LAST_MODIFIED: 'x-cache-last-modified',
  HEADERS: 'x-cache-headers',
} as const;

/**
 * Normalize a cache key to a valid S3 object key.
 * Strips leading slash and encodes special characters.
 */
const normalizeKey = (key: string): string => {
  const normalized = key.startsWith('/') ? key.slice(1) : key;
  return normalized || '__index__';
};

/**
 * AmplifyISRCacheHandler — production-ready cache handler backed by S3 and DynamoDB.
 *
 * Used at runtime inside the SSR Lambda to implement ISR caching and
 * on-demand revalidation via tags.
 *
 * @example
 * ```typescript
 * // In next.config.js or framework config:
 * module.exports = {
 *   cacheHandler: require.resolve('./cache-handler'),
 * };
 * ```
 */
export default class AmplifyISRCacheHandler {
  private s3: S3Client;
  private dynamodb: DynamoDBClient;
  private bucket: string;
  private table: string;

  /**
   * Initialize the cache handler, reading connection details from environment variables.
   * @throws {Error} If CACHE_BUCKET_NAME or CACHE_TABLE_NAME are not set.
   */
  constructor() {
    const bucket = process.env.CACHE_BUCKET_NAME;
    const table = process.env.CACHE_TABLE_NAME;

    if (bucket === undefined || bucket === null || bucket === '') {
      throw new Error(
        'CACHE_BUCKET_NAME environment variable is not set. ' +
          'Ensure the CacheConstruct is provisioned and the Lambda has the correct env vars.',
      );
    }
    if (table === undefined || table === null || table === '') {
      throw new Error(
        'CACHE_TABLE_NAME environment variable is not set. ' +
          'Ensure the CacheConstruct is provisioned and the Lambda has the correct env vars.',
      );
    }

    this.bucket = bucket;
    this.table = table;
    this.s3 = new S3Client({});
    this.dynamodb = new DynamoDBClient({});
  }

  /**
   * Retrieve a cached entry by key.
   *
   * Returns `null` if:
   * - The key does not exist in S3
   * - Any of the entry's tags have been invalidated (stale)
   * - The entry has exceeded its revalidation TTL
   *
   * @param key - Cache key (typically the request URL path).
   * @returns The cached entry, or null if not found/stale.
   */
  async get(key: string): Promise<CacheEntry | null> {
    const s3Key = `cache/${normalizeKey(key)}`;

    let s3Response;
    try {
      s3Response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
        }),
      );
    } catch (err: unknown) {
      const error = err as { name?: string };
      if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
        return null;
      }
      throw err;
    }

    const metadata = s3Response.Metadata ?? {};
    const lastModified = parseInt(
      metadata[META_KEYS.LAST_MODIFIED] ?? '0',
      10,
    );
    const revalidate = metadata[META_KEYS.REVALIDATE]
      ? parseInt(metadata[META_KEYS.REVALIDATE], 10)
      : undefined;
    const tags = metadata[META_KEYS.TAGS]
      ? metadata[META_KEYS.TAGS].split(',')
      : undefined;

    // Check TTL-based staleness
    if (revalidate !== undefined && revalidate > 0) {
      const ageMs = Date.now() - lastModified;
      if (ageMs > revalidate * 1000) {
        return null;
      }
    }

    // Check tag-based staleness
    if (tags && tags.length > 0) {
      const isStale = await this.isStaleByTags(key, tags, lastModified);
      if (isStale) {
        return null;
      }
    }

    const body = await this.streamToBuffer(s3Response.Body);
    const headers = metadata[META_KEYS.HEADERS]
      ? (JSON.parse(metadata[META_KEYS.HEADERS]) as Record<string, string>)
      : undefined;
    const status = metadata[META_KEYS.STATUS]
      ? parseInt(metadata[META_KEYS.STATUS], 10)
      : undefined;

    return {
      body,
      headers,
      status,
      revalidate,
      tags,
      lastModified,
    };
  }

  /**
   * Store a cache entry.
   *
   * Writes the response body to S3 with metadata (revalidation period, tags,
   * status, headers). If tags are provided, creates tag→key mappings in DynamoDB
   * for future on-demand invalidation.
   *
   * @param key - Cache key (typically the request URL path).
   * @param data - The response body to cache (Buffer or string).
   * @param ctx - Caching context (revalidate period, tags, status, headers).
   */
  async set(
    key: string,
    data: Buffer | string,
    ctx: CacheSetContext,
  ): Promise<void> {
    const s3Key = `cache/${normalizeKey(key)}`;
    const now = Date.now();
    const body = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;

    const metadata: Record<string, string> = {
      [META_KEYS.LAST_MODIFIED]: String(now),
    };

    if (ctx.revalidate !== undefined) {
      metadata[META_KEYS.REVALIDATE] = String(ctx.revalidate);
    }
    if (ctx.tags && ctx.tags.length > 0) {
      metadata[META_KEYS.TAGS] = ctx.tags.join(',');
    }
    if (ctx.status !== undefined) {
      metadata[META_KEYS.STATUS] = String(ctx.status);
    }
    if (ctx.headers) {
      metadata[META_KEYS.HEADERS] = JSON.stringify(ctx.headers);
    }

    // Write to S3
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: body,
        ContentType: 'application/octet-stream',
        Metadata: metadata,
      }),
    );

    // Update tag mappings in DynamoDB
    if (ctx.tags && ctx.tags.length > 0) {
      await this.updateTagMappings(key, ctx.tags);
    }
  }

  /**
   * Invalidate all cache entries associated with the given tag(s).
   *
   * Marks entries as stale by updating the `staleSince` timestamp in DynamoDB.
   * Subsequent `get()` calls for these entries will return `null`, triggering
   * the framework to regenerate the page.
   *
   * @param tags - A single tag or array of tags to invalidate.
   */
  async revalidateTag(tags: string | string[]): Promise<void> {
    const tagList = Array.isArray(tags) ? tags : [tags];
    const now = Date.now();

    const promises = tagList.map(async (tag) => {
      // Query all cache keys associated with this tag
      const queryResult = await this.dynamodb.send(
        new QueryCommand({
          TableName: this.table,
          KeyConditionExpression: 'tag = :tag',
          ExpressionAttributeValues: {
            ':tag': { S: tag },
          },
        }),
      );

      if (!queryResult.Items || queryResult.Items.length === 0) {
        return;
      }

      // Mark each tag→key entry as stale
      const updatePromises = queryResult.Items.map((item) => {
        const cacheKey = item.cacheKey?.S;
        if (!cacheKey) return Promise.resolve();

        return this.dynamodb.send(
          new UpdateItemCommand({
            TableName: this.table,
            Key: {
              tag: { S: tag },
              cacheKey: { S: cacheKey },
            },
            UpdateExpression: 'SET staleSince = :now',
            ExpressionAttributeValues: {
              ':now': { N: String(now) },
            },
          }),
        );
      });

      await Promise.all(updatePromises);
    });

    await Promise.all(promises);
  }

  /**
   * Delete a specific cache entry from S3.
   *
   * @param key - Cache key to delete.
   */
  async delete(key: string): Promise<void> {
    const s3Key = `cache/${normalizeKey(key)}`;
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      }),
    );
  }

  /**
   * Check if a cache entry is stale based on its tags.
   * An entry is stale if any of its tags have a `staleSince` timestamp
   * that is after the entry's `lastModified` timestamp.
   */
  private async isStaleByTags(
    key: string,
    tags: string[],
    lastModified: number,
  ): Promise<boolean> {
    const checks = tags.map(async (tag) => {
      try {
        const result = await this.dynamodb.send(
          new QueryCommand({
            TableName: this.table,
            KeyConditionExpression: 'tag = :tag AND cacheKey = :key',
            ExpressionAttributeValues: {
              ':tag': { S: tag },
              ':key': { S: key },
            },
          }),
        );

        if (!result.Items || result.Items.length === 0) {
          return false;
        }

        const item = result.Items[0];
        const staleSince = item.staleSince?.N;
        if (!staleSince) return false;

        return parseInt(staleSince, 10) > lastModified;
      } catch {
        return false;
      }
    });

    const results = await Promise.all(checks);
    return results.some(Boolean);
  }

  /**
   * Create or update tag→key mappings in DynamoDB.
   */
  private async updateTagMappings(
    key: string,
    tags: string[],
  ): Promise<void> {
    // Batch writes in groups of 25 (DynamoDB limit)
    const items = tags.map((tag) => ({
      PutRequest: {
        Item: {
          tag: { S: tag },
          cacheKey: { S: key },
          createdAt: { N: String(Date.now()) },
        },
      },
    }));

    const batchSize = 25;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await this.dynamodb.send(
        new BatchWriteItemCommand({
          RequestItems: {
            [this.table]: batch,
          },
        }),
      );
    }
  }

  /**
   * Convert a readable stream to a Buffer.
   */
  private async streamToBuffer(
    stream: unknown,
  ): Promise<Buffer> {
    if (stream instanceof Buffer) return stream;
    if (typeof stream === 'string') return Buffer.from(stream, 'utf-8');

    // AWS SDK v3 returns a Readable-like stream
    const readable = stream as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    for await (const chunk of readable) {
      chunks.push(
        typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer),
      );
    }
    return Buffer.concat(chunks);
  }
}
