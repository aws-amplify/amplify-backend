import {
  LogLevel,
  NoticesManifest,
  NoticesManifestValidator,
  noticesManifestSchema,
  printer,
} from '@aws-amplify/cli-core';
import { ConfigurationController } from '@aws-amplify/platform-core';

const cacheContentPath = 'noticesManifestCache.content';
const cacheContentRefreshTime = 'noticesManifestCache.refreshedAt';

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
    private readonly configurationController: ConfigurationController,
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

      await this.configurationController.set(
        cacheContentPath,
        Buffer.from(JSON.stringify(noticesManifest)).toString('base64'),
      );
      await this.configurationController.set(
        cacheContentRefreshTime,
        this.refreshedAt,
      );
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
      const serializedCachedContent: string | undefined =
        await this.configurationController.get(cacheContentPath);
      if (!serializedCachedContent) {
        return;
      }
      const refreshedAt: number | undefined =
        await this.configurationController.get(cacheContentRefreshTime);
      if (!refreshedAt) {
        return;
      }
      const decodedContent = Buffer.from(
        serializedCachedContent,
        'base64',
      ).toString('utf-8');
      const cachedManifest = noticesManifestSchema.parse(
        JSON.parse(decodedContent),
      );
      await this.noticeManifestValidator.validate(cachedManifest);
      this.cachedManifest = cachedManifest;
      this.refreshedAt = refreshedAt;
    } catch (e) {
      printer.log('Unable to read cached notices manifest', LogLevel.DEBUG);
      if (e instanceof Error) {
        printer.log(e.message, LogLevel.DEBUG);
      }
    }
  };
}
