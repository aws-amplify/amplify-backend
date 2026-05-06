import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert';

// Helper types for mock send functions
type MockSendFn = ReturnType<typeof mock.fn>;

let mockS3Send: MockSendFn;
let mockDynamoSend: MockSendFn;

/**
 * Creates a test instance of the cache handler with mocked AWS clients.
 */
const createTestHandler = async () => {
  // Set required environment variables
  process.env.CACHE_BUCKET_NAME = 'test-cache-bucket';
  process.env.CACHE_TABLE_NAME = 'test-cache-table';

  // Dynamic import to get fresh module instance
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { default: CacheHandler } = await import('./cache_handler.js');

  const handler = new CacheHandler();

  // Replace the internal clients' send methods with mocks
  mockS3Send = mock.fn();
  mockDynamoSend = mock.fn();

  // Access private fields for testing
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const handlerRef = handler as any;
  handlerRef.s3.send = mockS3Send;
  handlerRef.dynamodb.send = mockDynamoSend;
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return handler;
};

// ================================================================
// Constructor validation
// ================================================================

void describe('AmplifyISRCacheHandler — constructor', () => {
  const originalBucket = process.env.CACHE_BUCKET_NAME;
  const originalTable = process.env.CACHE_TABLE_NAME;

  afterEach(() => {
    if (originalBucket !== undefined) {
      process.env.CACHE_BUCKET_NAME = originalBucket;
    } else {
      delete process.env.CACHE_BUCKET_NAME;
    }
    if (originalTable !== undefined) {
      process.env.CACHE_TABLE_NAME = originalTable;
    } else {
      delete process.env.CACHE_TABLE_NAME;
    }
  });

  void it('throws when CACHE_BUCKET_NAME is not set', async () => {
    delete process.env.CACHE_BUCKET_NAME;
    process.env.CACHE_TABLE_NAME = 'test-table';

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { default: CacheHandler } = await import('./cache_handler.js');

    assert.throws(
      () => new CacheHandler(),
      /CACHE_BUCKET_NAME environment variable is not set/,
    );
  });

  void it('throws when CACHE_TABLE_NAME is not set', async () => {
    process.env.CACHE_BUCKET_NAME = 'test-bucket';
    delete process.env.CACHE_TABLE_NAME;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { default: CacheHandler } = await import('./cache_handler.js');

    assert.throws(
      () => new CacheHandler(),
      /CACHE_TABLE_NAME environment variable is not set/,
    );
  });

  void it('throws when CACHE_BUCKET_NAME is empty string', async () => {
    process.env.CACHE_BUCKET_NAME = '';
    process.env.CACHE_TABLE_NAME = 'test-table';

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { default: CacheHandler } = await import('./cache_handler.js');

    assert.throws(
      () => new CacheHandler(),
      /CACHE_BUCKET_NAME environment variable is not set/,
    );
  });

  void it('creates successfully with valid env vars', async () => {
    process.env.CACHE_BUCKET_NAME = 'my-bucket';
    process.env.CACHE_TABLE_NAME = 'my-table';

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { default: CacheHandler } = await import('./cache_handler.js');

    const handler = new CacheHandler();
    assert.ok(handler);
  });
});

// ================================================================
// get() method
// ================================================================

void describe('AmplifyISRCacheHandler — get()', () => {
  afterEach(() => {
    delete process.env.CACHE_BUCKET_NAME;
    delete process.env.CACHE_TABLE_NAME;
  });

  void it('returns null when key does not exist in S3', async () => {
    const handler = await createTestHandler();

    mockS3Send.mock.mockImplementation(async () => {
      const error = new Error('NoSuchKey') as Error & { name: string };
      error.name = 'NoSuchKey';
      throw error;
    });

    const result = await handler.get('/blog/hello');
    assert.strictEqual(result, null);
  });

  void it('returns cached entry when key exists and is fresh', async () => {
    const handler = await createTestHandler();
    const now = Date.now();
    const bodyContent = Buffer.from('<html>cached page</html>');

    mockS3Send.mock.mockImplementation(async () => ({
      Body: bodyContent,
      Metadata: {
        'x-cache-revalidate': '3600',
        'x-cache-tags': 'blog,posts',
        'x-cache-status': '200',
        'x-cache-last-modified': String(now - 1000),
        'x-cache-headers': JSON.stringify({ 'content-type': 'text/html' }),
      },
    }));

    // Mock DynamoDB to return no stale tags
    mockDynamoSend.mock.mockImplementation(async () => ({
      Items: [],
    }));

    const result = await handler.get('/blog/hello');
    assert.ok(result);
    assert.deepStrictEqual(result.body, bodyContent);
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.revalidate, 3600);
    assert.deepStrictEqual(result.tags, ['blog', 'posts']);
    assert.deepStrictEqual(result.headers, { 'content-type': 'text/html' });
  });

  void it('returns null when entry has exceeded revalidation TTL', async () => {
    const handler = await createTestHandler();
    const bodyContent = Buffer.from('stale page');

    mockS3Send.mock.mockImplementation(async () => ({
      Body: bodyContent,
      Metadata: {
        'x-cache-revalidate': '60',
        'x-cache-last-modified': String(Date.now() - 120_000),
      },
    }));

    const result = await handler.get('/stale-page');
    assert.strictEqual(result, null);
  });

  void it('returns null when tags are stale', async () => {
    const handler = await createTestHandler();
    const lastModified = Date.now() - 10_000;
    const bodyContent = Buffer.from('tagged page');

    mockS3Send.mock.mockImplementation(async () => ({
      Body: bodyContent,
      Metadata: {
        'x-cache-revalidate': '3600',
        'x-cache-tags': 'blog',
        'x-cache-last-modified': String(lastModified),
      },
    }));

    // DynamoDB says this tag was invalidated after the entry was cached
    mockDynamoSend.mock.mockImplementation(async () => ({
      Items: [
        {
          tag: { S: 'blog' },
          cacheKey: { S: '/tagged-page' },
          staleSince: { N: String(lastModified + 5000) },
        },
      ],
    }));

    const result = await handler.get('/tagged-page');
    assert.strictEqual(result, null);
  });

  void it('returns entry when tags exist but are not stale', async () => {
    const handler = await createTestHandler();
    const lastModified = Date.now() - 10_000;
    const bodyContent = Buffer.from('fresh tagged page');

    mockS3Send.mock.mockImplementation(async () => ({
      Body: bodyContent,
      Metadata: {
        'x-cache-revalidate': '3600',
        'x-cache-tags': 'blog',
        'x-cache-last-modified': String(lastModified),
      },
    }));

    // staleSince is BEFORE the entry was cached — entry is still fresh
    mockDynamoSend.mock.mockImplementation(async () => ({
      Items: [
        {
          tag: { S: 'blog' },
          cacheKey: { S: '/fresh-tagged' },
          staleSince: { N: String(lastModified - 5000) },
        },
      ],
    }));

    const result = await handler.get('/fresh-tagged');
    assert.ok(result);
    assert.deepStrictEqual(result.body, bodyContent);
  });
});

// ================================================================
// set() method
// ================================================================

void describe('AmplifyISRCacheHandler — set()', () => {
  afterEach(() => {
    delete process.env.CACHE_BUCKET_NAME;
    delete process.env.CACHE_TABLE_NAME;
  });

  void it('stores entry in S3 with correct metadata', async () => {
    const handler = await createTestHandler();
    let capturedS3Params: Record<string, unknown> | null = null;

    mockS3Send.mock.mockImplementation(async (cmd: { input: Record<string, unknown> }) => {
      capturedS3Params = cmd.input;
      return {};
    });
    mockDynamoSend.mock.mockImplementation(async () => ({}));

    await handler.set('/blog/post-1', '<html>hello</html>', {
      revalidate: 60,
      tags: ['blog', 'post-1'],
      status: 200,
      headers: { 'content-type': 'text/html' },
    });

    assert.ok(capturedS3Params);
    assert.strictEqual(
      (capturedS3Params as Record<string, unknown>).Bucket,
      'test-cache-bucket',
    );
    assert.strictEqual(
      (capturedS3Params as Record<string, unknown>).Key,
      'cache/blog/post-1',
    );

    const metadata = (capturedS3Params as Record<string, unknown>)
      .Metadata as Record<string, string>;
    assert.strictEqual(metadata['x-cache-revalidate'], '60');
    assert.strictEqual(metadata['x-cache-tags'], 'blog,post-1');
    assert.strictEqual(metadata['x-cache-status'], '200');
    assert.ok(metadata['x-cache-last-modified']);
  });

  void it('writes tag mappings to DynamoDB', async () => {
    const handler = await createTestHandler();
    let capturedDynamoParams: Record<string, unknown> | null = null;

    mockS3Send.mock.mockImplementation(async () => ({}));
    mockDynamoSend.mock.mockImplementation(async (cmd: { input: Record<string, unknown> }) => {
      capturedDynamoParams = cmd.input;
      return {};
    });

    await handler.set('/blog/post-1', Buffer.from('data'), {
      tags: ['blog', 'post-1'],
    });

    assert.ok(capturedDynamoParams);
    const requestItems = (capturedDynamoParams as Record<string, unknown>)
      .RequestItems as Record<string, Array<{ PutRequest: { Item: { tag: { S: string } } } }>>;
    assert.ok(requestItems);
    assert.ok(requestItems['test-cache-table']);

    const items = requestItems['test-cache-table'];
    assert.strictEqual(items.length, 2);

    const tagValues = items.map((i) => i.PutRequest.Item.tag.S);
    assert.ok(tagValues.includes('blog'));
    assert.ok(tagValues.includes('post-1'));
  });

  void it('handles string data by converting to Buffer', async () => {
    const handler = await createTestHandler();
    let capturedBody: unknown = null;

    mockS3Send.mock.mockImplementation(async (cmd: { input: { Body: unknown } }) => {
      capturedBody = cmd.input.Body;
      return {};
    });
    mockDynamoSend.mock.mockImplementation(async () => ({}));

    await handler.set('/page', 'string data', { revalidate: 30 });

    assert.ok(Buffer.isBuffer(capturedBody));
    assert.strictEqual((capturedBody as Buffer).toString(), 'string data');
  });

  void it('normalizes keys with leading slash', async () => {
    const handler = await createTestHandler();
    let capturedKey: string | undefined;

    mockS3Send.mock.mockImplementation(async (cmd: { input: { Key?: string } }) => {
      capturedKey = cmd.input.Key;
      return {};
    });
    mockDynamoSend.mock.mockImplementation(async () => ({}));

    await handler.set('/my/page', 'data', {});

    assert.strictEqual(capturedKey, 'cache/my/page');
  });

  void it('handles root path as __index__', async () => {
    const handler = await createTestHandler();
    let capturedKey: string | undefined;

    mockS3Send.mock.mockImplementation(async (cmd: { input: { Key?: string } }) => {
      capturedKey = cmd.input.Key;
      return {};
    });
    mockDynamoSend.mock.mockImplementation(async () => ({}));

    await handler.set('/', 'data', {});

    assert.strictEqual(capturedKey, 'cache/__index__');
  });
});

// ================================================================
// revalidateTag() method
// ================================================================

void describe('AmplifyISRCacheHandler — revalidateTag()', () => {
  afterEach(() => {
    delete process.env.CACHE_BUCKET_NAME;
    delete process.env.CACHE_TABLE_NAME;
  });

  void it('marks all keys with the given tag as stale', async () => {
    const handler = await createTestHandler();
    const updateCalls: Array<Record<string, unknown>> = [];

    mockDynamoSend.mock.mockImplementation(
      async (cmd: { input: Record<string, unknown> }) => {
        if (
          (cmd.input as { KeyConditionExpression?: string })
            .KeyConditionExpression
        ) {
          // QueryCommand — return some keys
          return {
            Items: [
              { tag: { S: 'blog' }, cacheKey: { S: '/blog/post-1' } },
              { tag: { S: 'blog' }, cacheKey: { S: '/blog/post-2' } },
            ],
          };
        }
        // UpdateItemCommand
        updateCalls.push(cmd.input);
        return {};
      },
    );

    await handler.revalidateTag('blog');

    assert.strictEqual(updateCalls.length, 2);

    const key0 = (updateCalls[0] as { Key: { cacheKey: { S: string } } }).Key
      .cacheKey.S;
    const key1 = (updateCalls[1] as { Key: { cacheKey: { S: string } } }).Key
      .cacheKey.S;
    assert.strictEqual(key0, '/blog/post-1');
    assert.strictEqual(key1, '/blog/post-2');

    const exprValues = (
      updateCalls[0] as {
        ExpressionAttributeValues: { ':now': { N: string } };
      }
    ).ExpressionAttributeValues;
    assert.ok(exprValues[':now'].N);
  });

  void it('handles array of tags', async () => {
    const handler = await createTestHandler();
    const queriedTags: string[] = [];

    mockDynamoSend.mock.mockImplementation(
      async (cmd: { input: Record<string, unknown> }) => {
        const input = cmd.input as {
          KeyConditionExpression?: string;
          ExpressionAttributeValues?: { ':tag'?: { S: string } };
        };
        if (input.KeyConditionExpression) {
          const tag = input.ExpressionAttributeValues?.[':tag']?.S;
          if (tag) queriedTags.push(tag);
          return { Items: [] };
        }
        return {};
      },
    );

    await handler.revalidateTag(['blog', 'posts', 'featured']);

    assert.strictEqual(queriedTags.length, 3);
    assert.ok(queriedTags.includes('blog'));
    assert.ok(queriedTags.includes('posts'));
    assert.ok(queriedTags.includes('featured'));
  });

  void it('does nothing when no keys are associated with the tag', async () => {
    const handler = await createTestHandler();
    let updateCalled = false;

    mockDynamoSend.mock.mockImplementation(
      async (cmd: { input: Record<string, unknown> }) => {
        const input = cmd.input as { KeyConditionExpression?: string };
        if (input.KeyConditionExpression) {
          return { Items: [] };
        }
        updateCalled = true;
        return {};
      },
    );

    await handler.revalidateTag('non-existent-tag');

    assert.strictEqual(updateCalled, false);
  });
});

// ================================================================
// delete() method
// ================================================================

void describe('AmplifyISRCacheHandler — delete()', () => {
  afterEach(() => {
    delete process.env.CACHE_BUCKET_NAME;
    delete process.env.CACHE_TABLE_NAME;
  });

  void it('deletes the correct S3 key', async () => {
    const handler = await createTestHandler();
    let capturedKey: string | undefined;

    mockS3Send.mock.mockImplementation(async (cmd: { input: { Key?: string } }) => {
      capturedKey = cmd.input.Key;
      return {};
    });

    await handler.delete('/blog/old-post');

    assert.strictEqual(capturedKey, 'cache/blog/old-post');
  });
});
