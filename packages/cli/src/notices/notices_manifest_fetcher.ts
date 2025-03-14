import {
  LogLevel,
  NoticesManifest,
  NoticesManifestValidator,
  noticesManifestSchema,
  printer,
} from '@aws-amplify/cli-core';
import { ZodSchemaTypedConfigurationFile } from '@aws-amplify/platform-core';
import { z } from 'zod';

const noticesManifestCacheSchema = z.object({
  noticesManifest: noticesManifestSchema,
  refreshedAt: z.number(),
});

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
    private readonly fileCache = new ZodSchemaTypedConfigurationFile(
      noticesManifestCacheSchema,
      'notices-manifest-cache.json',
    ),
    private readonly noticeManifestValidator = new NoticesManifestValidator({
      checkLinksWithGitHubApi: false,
    }),
    private readonly noticesManifestUrl = process.env
      .AMPLIFY_BACKEND_NOTICES_ENDPOINT ||
      'https://notices.cli.amplify.aws/notices.json',
    private readonly cacheTTLMs = 60 * 60 * 1000, // one hour
  ) {}

  fetchNoticesManifest = async (): Promise<NoticesManifest> => {
    if (this.isStale()) {
      await this.tryLoadManifestFromDisk();
    }
    if (this.isStale()) {
      await this.tryLoadManifestFromWebsiteAndCache();
    }
    return this.cachedManifest;
  };

  private isStale = (): boolean => {
    if (!this.refreshedAt) {
      return true;
    }
    return Date.now() - this.refreshedAt > this.cacheTTLMs;
  };

  private tryLoadManifestFromWebsiteAndCache = async (): Promise<void> => {
    try {
      const response = await fetch(this.noticesManifestUrl);
      const noticesManifest = noticesManifestSchema.parse(
        await response.json(),
      );
      await this.noticeManifestValidator.validate(noticesManifest);

      this.cachedManifest = noticesManifest;
      this.refreshedAt = Date.now();

      await this.fileCache.write({
        noticesManifest: noticesManifest,
        refreshedAt: this.refreshedAt,
      });
    } catch (e) {
      printer.log(
        `Unable to fetch notices manifest from ${this.noticesManifestUrl}`,
        LogLevel.DEBUG,
      );
      if (e instanceof Error) {
        printer.log(e.message, LogLevel.DEBUG);
      }
    }
  };

  private tryLoadManifestFromDisk = async (): Promise<void> => {
    try {
      const cachedContent = await this.fileCache.tryRead();
      if (!cachedContent) {
        return;
      }
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
