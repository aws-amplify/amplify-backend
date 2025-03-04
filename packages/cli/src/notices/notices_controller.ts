import { Notice } from '@aws-amplify/platform-core/notices';
import { NoticesManifestFetcher } from './notices_manifest_fetcher.js';

/**
 * A notices controller.
 */
export class NoticesController {
  /**
   * Creates notices controller.
   */
  constructor(
    private readonly noticesManifestFetcher = new NoticesManifestFetcher()
  ) {}
  getApplicableNotices = async (): Promise<Array<Notice>> => {
    const noticesManifest =
      await this.noticesManifestFetcher.fetchNoticesManifest();
    return noticesManifest.currentNotices;
  };
}
