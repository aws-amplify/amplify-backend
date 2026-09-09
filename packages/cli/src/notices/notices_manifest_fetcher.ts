import {
  LogLevel,
  NoticesManifest,
  NoticesManifestValidator,
  noticesManifestSchema,
  printer,
} from '@aws-amplify/cli-core';
import { noticesMetadataFileInstance } from './notices_files.js';
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
    private readonly noticesMetadataFile = noticesMetadataFileInstance,
    private readonly noticeManifestValidator = new NoticesManifestValidator({
      checkLinksWithGitHubApi: false,
    }),
    private readonly noticesManifestUrl = process.env
      .AMPLIFY_BACKEND_NOTICES_ENDPOINT ||
      'https://notices.cli.amplify.aws/notices.json',
    private readonly cacheTTLMs = 60 * 60 * 1000, // one hour
    private readonly _fetch = fetch,
    private readonly _printer = printer,
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

    const metadata = await this.noticesMetadataFile.read();
    metadata.manifestCache = {
      noticesManifest: noticesManifest,
      refreshedAt: this.refreshedAt,
    };
    await this.noticesMetadataFile.write(metadata);
  };

  private tryLoadManifestFromDisk = async (): Promise<void> => {
    try {
      const metadata = await this.noticesMetadataFile.read();
      await this.noticeManifestValidator.validate(
        metadata.manifestCache.noticesManifest,
      );
      this.cachedManifest = metadata.manifestCache.noticesManifest;
      this.refreshedAt = metadata.manifestCache.refreshedAt;
    } catch (e) {
      this._printer.log(
        'Unable to read cached notices manifest',
        LogLevel.DEBUG,
      );
      if (e instanceof Error) {
        this._printer.log(e.message, LogLevel.DEBUG);
      }
    }
  };
}
