import { NoticesManifest, noticesManifestSchema } from '@aws-amplify/cli-core';

/**
 * Notices manifest fetcher.
 */
export class NoticesManifestFetcher {
  /**
   * Creates new notices manifest fetcher.
   */
  constructor(
    private readonly noticesManifestUrl = process.env
      .AMPLIFY_BACKEND_NOTICES_ENDPOINT ||
      'https://notices.cli.amplify.aws/notices.json'
  ) {}

  fetchNoticesManifest = async (): Promise<NoticesManifest> => {
    const response = await fetch(this.noticesManifestUrl);
    return noticesManifestSchema.parse(await response.json());
  };
}
