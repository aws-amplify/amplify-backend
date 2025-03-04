import {
  NoticesManifest,
  noticesManifestSchema,
} from '@aws-amplify/platform-core/notices';

/**
 * Notices manifest fetcher.
 */
export class NoticesManifestFetcher {
  fetchNoticesManifest = async (): Promise<NoticesManifest> => {
    const response = await fetch(
      'https://main.d1rob4p7vpnhv.amplifyapp.com/notices.json'
    );
    return noticesManifestSchema.parse(await response.json());
  };
}
