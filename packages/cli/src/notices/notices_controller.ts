import { Notice } from '@aws-amplify/cli-core';
import { NoticesManifestFetcher } from './notices_manifest_fetcher.js';
import {
  PackageJsonReader,
  configControllerFactory,
} from '@aws-amplify/platform-core';
import {
  LocalNamespaceResolver,
  NamespaceResolver,
} from '../backend-identifier/local_namespace_resolver.js';

/**
 * A notices controller.
 */
export class NoticesController {
  /**
   * Creates notices controller.
   */
  constructor(
    private readonly configurationController = configControllerFactory.getInstance(
      'notices.json'
    ),
    private readonly namespaceResolver: NamespaceResolver = new LocalNamespaceResolver(
      new PackageJsonReader()
    ),
    private readonly noticesManifestFetcher = new NoticesManifestFetcher(
      configurationController
    )
  ) {}
  getApplicableNotices = async (opts?: {
    includeAcknowledged: boolean;
  }): Promise<Array<Notice>> => {
    const noticesManifest =
      await this.noticesManifestFetcher.fetchNoticesManifest();
    let notices = noticesManifest.notices;
    if (!opts?.includeAcknowledged) {
      notices = await this.filterAcknowledgedNotices(notices);
    }
    return notices;
  };

  acknowledge = async (noticeId: string) => {
    const path = await this.getNoticeAcknowledgementPath(noticeId);
    await this.configurationController.set(path, true);
  };

  private filterAcknowledgedNotices = async (
    notices: Array<Notice>
  ): Promise<Array<Notice>> => {
    const filteredNotices: Array<Notice> = [];
    for (const notice of notices) {
      const path = await this.getNoticeAcknowledgementPath(notice.id);
      const isAcknowledged: boolean = await this.configurationController.get(
        path
      );
      if (!isAcknowledged) {
        filteredNotices.push(notice);
      }
    }
    return filteredNotices;
  };

  private getNoticeAcknowledgementPath = async (
    noticeId: string
  ): Promise<string> => {
    return `acknowledgements.${await this.namespaceResolver.resolve()}.${noticeId}`;
  };
}
