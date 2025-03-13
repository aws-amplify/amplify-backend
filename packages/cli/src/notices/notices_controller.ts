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
import { NoticePredicatesEvaluator } from './notice_predictes_evaluator.js';
import { PackageManagerController } from '@aws-amplify/plugin-types';

/**
 * A notices controller.
 */
export class NoticesController {
  /**
   * Creates notices controller.
   */
  constructor(
    private readonly packageManagerController: PackageManagerController,
    private readonly configurationController = configControllerFactory.getInstance(
      'notices.json'
    ),
    private readonly namespaceResolver: NamespaceResolver = new LocalNamespaceResolver(
      new PackageJsonReader()
    ),
    private readonly noticesManifestFetcher = new NoticesManifestFetcher(
      configurationController
    ),
    private readonly noticePredicatesEvaluator = new NoticePredicatesEvaluator(
      packageManagerController
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
    notices = await this.applyPredicates(notices);
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

  private applyPredicates = async (
    notices: Array<Notice>
  ): Promise<Array<Notice>> => {
    const filteredNotices: Array<Notice> = [];
    for (const notice of notices) {
      if (await this.noticePredicatesEvaluator.evaluate(notice.predicates)) {
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
