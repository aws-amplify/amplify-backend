import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { NoticesManifestFetcher } from './notices_manifest_fetcher.js';
import {
  LogLevel,
  NoticesManifest,
  NoticesManifestValidator,
  Printer,
} from '@aws-amplify/cli-core';
import { TypedConfigurationFile } from '@aws-amplify/platform-core';
import { fileCacheInstance } from './notices_files.js';

void describe('NoticesManifestFetcher', () => {
  // Mock dependencies
  const mockFetch = mock.fn<typeof fetch>();
  const mockFileCache = {
    read: mock.fn<TypedConfigurationFile<unknown>['read']>(),
    write: mock.fn<TypedConfigurationFile<unknown>['write']>(),
  };
  const mockValidator = {
    validate: mock.fn<NoticesManifestValidator['validate']>(),
  };
  const mockPrinter = {
    log: mock.fn<Printer['log']>(),
  };

  beforeEach(() => {
    mockFetch.mock.resetCalls();
    mockFileCache.read.mock.resetCalls();
    mockFileCache.write.mock.resetCalls();
    mockValidator.validate.mock.resetCalls();
    mockPrinter.log.mock.resetCalls();
  });

  void it('successfully fetches and caches manifest from website', async () => {
    const testManifest: NoticesManifest = { notices: [] };
    const fetchResponse = {
      ok: true,
      status: 200,
      json: async () => testManifest,
    } as Response;

    mockFetch.mock.mockImplementation(() => Promise.resolve(fetchResponse));
    mockValidator.validate.mock.mockImplementation(() => Promise.resolve());
    mockFileCache.write.mock.mockImplementation(() => Promise.resolve());

    const fetcher = new NoticesManifestFetcher(
      mockFileCache as unknown as typeof fileCacheInstance,
      mockValidator as unknown as NoticesManifestValidator,
      'https://test-url',
      1000, // 1 second TTL
      mockFetch as unknown as typeof fetch,
      mockPrinter as unknown as Printer,
    );

    const result = await fetcher.fetchNoticesManifest();

    assert.deepStrictEqual(result, testManifest);
    assert.strictEqual(mockFetch.mock.calls.length, 1);
    assert.strictEqual(mockFileCache.write.mock.calls.length, 1);
    assert.strictEqual(mockValidator.validate.mock.calls.length, 1);
  });

  void it('loads manifest from cache when not stale', async () => {
    const testManifest: NoticesManifest = { notices: [] };
    const cachedContent = {
      noticesManifest: testManifest,
      refreshedAt: Date.now(),
    };

    mockFileCache.read.mock.mockImplementation(() =>
      Promise.resolve(cachedContent),
    );
    mockValidator.validate.mock.mockImplementation(() => Promise.resolve());

    const fetcher = new NoticesManifestFetcher(
      mockFileCache as unknown as typeof fileCacheInstance,
      mockValidator as unknown as NoticesManifestValidator,
      'https://test-url',
      1000, // 1 second TTL
      mockFetch as unknown as typeof fetch,
      mockPrinter as unknown as Printer,
    );

    const result = await fetcher.fetchNoticesManifest();

    assert.deepStrictEqual(result, testManifest);
    assert.strictEqual(mockFetch.mock.calls.length, 0);
  });

  void it('handles fetch failure gracefully', async () => {
    const fetchResponse = {
      ok: false,
      status: 404,
    } as Response;

    mockFetch.mock.mockImplementation(() => Promise.resolve(fetchResponse));
    mockFileCache.read.mock.mockImplementation(() =>
      Promise.reject(new Error('Cache miss')),
    );

    const fetcher = new NoticesManifestFetcher(
      mockFileCache as unknown as typeof fileCacheInstance,
      mockValidator as unknown as NoticesManifestValidator,
      'https://test-url',
      1000, // 1 second TTL
      mockFetch as unknown as typeof fetch,
      mockPrinter as unknown as Printer,
    );

    await assert.rejects(async () => await fetcher.fetchNoticesManifest(), {
      name: 'NoticeManifestFetchFault',
      message: /Attempt to fetch notices manifest failed/,
    });
  });

  void it('refreshes stale cache', async () => {
    const staleTestManifest: NoticesManifest = {
      notices: [
        {
          id: '1',
          title: 'Stale notice',
          details: 'Stale details',
          predicates: [],
        },
      ],
    };
    const staleCache = {
      noticesManifest: staleTestManifest,
      refreshedAt: Date.now() - 3600000, // 1 hour ago
    };
    const testManifest: NoticesManifest = {
      notices: [
        {
          id: '1',
          title: 'Fresh notice',
          details: 'Fresh details',
          predicates: [],
        },
      ],
    };
    const fetchResponse = {
      ok: true,
      status: 200,
      json: async () => testManifest,
    } as Response;

    mockFileCache.read.mock.mockImplementation(() =>
      Promise.resolve(staleCache),
    );
    mockFetch.mock.mockImplementation(() => Promise.resolve(fetchResponse));
    mockValidator.validate.mock.mockImplementation(() => Promise.resolve());

    const fetcher = new NoticesManifestFetcher(
      mockFileCache as unknown as typeof fileCacheInstance,
      mockValidator as unknown as NoticesManifestValidator,
      'https://test-url',
      1000, // 1 second TTL
      mockFetch as unknown as typeof fetch,
      mockPrinter as unknown as Printer,
    );

    const result = await fetcher.fetchNoticesManifest();

    assert.deepStrictEqual(result, await fetchResponse.json());
    assert.strictEqual(mockFetch.mock.calls.length, 1);
  });

  void it('handles cache read failure gracefully', async () => {
    const testManifest: NoticesManifest = { notices: [] };
    const fetchResponse = {
      ok: true,
      status: 200,
      json: async () => testManifest,
    } as Response;

    mockFileCache.read.mock.mockImplementation(() =>
      Promise.reject(new Error('Cache error')),
    );
    mockFetch.mock.mockImplementation(() => Promise.resolve(fetchResponse));
    mockValidator.validate.mock.mockImplementation(() => Promise.resolve());

    const fetcher = new NoticesManifestFetcher(
      mockFileCache as unknown as typeof fileCacheInstance,
      mockValidator as unknown as NoticesManifestValidator,
      'https://test-url',
      1000, // 1 second TTL
      mockFetch as unknown as typeof fetch,
      mockPrinter as unknown as Printer,
    );

    const result = await fetcher.fetchNoticesManifest();

    assert.deepStrictEqual(result, testManifest);
    assert.strictEqual(mockPrinter.log.mock.calls.length, 2);
    assert.strictEqual(
      mockPrinter.log.mock.calls[0].arguments[1],
      LogLevel.DEBUG,
    );
  });
});
