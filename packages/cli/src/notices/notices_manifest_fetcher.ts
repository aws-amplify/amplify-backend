import {
  LogLevel,
  NoticesManifest,
  NoticesManifestValidator,
  noticesManifestSchema,
  printer,
} from '@aws-amplify/cli-core';
import { fileCacheInstance } from './notices_files.js';
import { AmplifyFault } from '@aws-amplify/platform-core';

/**
 * Notices manifest fetcher.
 */
export class NoticesManifestFetcher {
  // In memory cache
  private cachedManifest: NoticesManifest = { notices: [] };
  private refreshedAt: number | undefined = undefined;

  /**
   * Creates new notices manifest fetcher.
   */
  constructor(
    private readonly fileCache = fileCacheInstance,
    private readonly noticeManifestValidator = new NoticesManifestValidator({
      checkLinksWithGitHubApi: false,
    }),
    private readonly noticesManifestUrl = process.env
      .AMPLIFY_BACKEND_NOTICES_ENDPOINT ||
      'https://notices.cli.amplify.aws/notices.json',
    private readonly cacheTTLMs = 60 * 60 * 1000, // one hour
    private readonly _fetch = fetch,
  ) {}

  fetchNoticesManifest = async (): Promise<NoticesManifest> => {
    if (this.isStale()) {
      await this.tryLoadManifestFromDisk();
    }
    if (this.isStale()) {
      await this.loadManifestFromWebsiteAndCache();
    }
    return this.cachedManifest;
  };

  private isStale = (): boolean => {
    if (!this.refreshedAt) {
      return true;
    }
    return Date.now() - this.refreshedAt > this.cacheTTLMs;
  };

  private loadManifestFromWebsiteAndCache = async (): Promise<void> => {
    const response = await this._fetch(this.noticesManifestUrl);
    if (!response.ok) {
      throw new AmplifyFault('NoticeManifestFetchFault', {
        message: `Attempt to fetch notices manifest failed, url=${this.noticesManifestUrl}, statusCode=${response.status}`,
      });
    }

    const noticesManifest = noticesManifestSchema.parse(await response.json());
    await this.noticeManifestValidator.validate(noticesManifest);

    this.cachedManifest = noticesManifest;
    this.refreshedAt = Date.now();

    await this.fileCache.write({
      noticesManifest: noticesManifest,
      refreshedAt: this.refreshedAt,
    });
  };

  private tryLoadManifestFromDisk = async (): Promise<void> => {
    try {
      const cachedContent = await this.fileCache.read();
      await this.noticeManifestValidator.validate(
        cachedContent.noticesManifest,
      );
      this.cachedManifest = cachedContent.noticesManifest;
      this.refreshedAt = cachedContent.refreshedAt;
    } catch (e) {
      printer.log('Unable to read cached notices manifest', LogLevel.DEBUG);
      if (e instanceof Error) {
        printer.log(e.message, LogLevel.DEBUG);
      }
    }
  };
}
