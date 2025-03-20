import { Notice } from '@aws-amplify/cli-core';
import { NoticesManifestFetcher } from './notices_manifest_fetcher.js';
import {
  AmplifyUserError,
  PackageJsonReader,
} from '@aws-amplify/platform-core';
import {
  LocalNamespaceResolver,
  NamespaceResolver,
} from '../backend-identifier/local_namespace_resolver.js';
import { NoticePredicatesEvaluator } from './notice_predicates_evaluator.js';
import { PackageManagerController } from '@aws-amplify/plugin-types';
import { NoticesRendererParams } from './notices_renderer.js';
import {
  noticesAcknowledgementFileInstance,
  noticesMetadataFileInstance,
} from './notices_files.js';

/**
 * A notices controller.
 */
export class NoticesController {
  /**
   * Creates notices controller.
   */
  constructor(
    private readonly packageManagerController: PackageManagerController,
    private readonly noticesAcknowledgementFile = noticesAcknowledgementFileInstance,
    private readonly noticesMetadataFile = noticesMetadataFileInstance,
    private readonly namespaceResolver: NamespaceResolver = new LocalNamespaceResolver(
      new PackageJsonReader(),
    ),
    private readonly noticesManifestFetcher = new NoticesManifestFetcher(),
    private readonly noticePredicatesEvaluator = new NoticePredicatesEvaluator(
      packageManagerController,
      namespaceResolver,
    ),
  ) {}
  getApplicableNotices = async (
    params: {
      includeAcknowledged?: boolean;
    } & NoticesRendererParams,
  ): Promise<Array<Notice>> => {
    const noticesManifest =
      await this.noticesManifestFetcher.fetchNoticesManifest();
    let notices = noticesManifest.notices;
    if (!params.includeAcknowledged) {
      notices = await this.filterAcknowledgedNotices(notices);
    }
    notices = await this.applyPredicates(notices, params);
    return notices;
  };

  acknowledge = async (noticeId: string) => {
    const projectName = await this.namespaceResolver.resolve();
    const noticesManifest =
      await this.noticesManifestFetcher.fetchNoticesManifest();
    const notice = noticesManifest.notices.find((item) => item.id === noticeId);
    if (!notice) {
      throw new AmplifyUserError('NoticeNotFoundError', {
        message: `Notice with id=${noticeId} does not exist.`,
        resolution: `Ensure that notice being acknowledged exists. Run '${this.packageManagerController.getCommand(
          ['ampx', 'notices', 'list'],
        )}' to find available notices`,
      });
    }
    const acknowledgementFileContent =
      await this.noticesAcknowledgementFile.read();
    const existingAcknowledgement =
      acknowledgementFileContent.projectAcknowledgements.find(
        (item) =>
          item.projectName === projectName && item.noticeId === noticeId,
      );
    if (existingAcknowledgement) {
      existingAcknowledgement.acknowledgedAt = Date.now();
    } else {
      acknowledgementFileContent.projectAcknowledgements.push({
        projectName,
        noticeId,
        acknowledgedAt: Date.now(),
      });
    }
    await this.noticesAcknowledgementFile.write(acknowledgementFileContent);
  };

  recordPrintingTimes = async (notices: Array<Notice>) => {
    const projectName = await this.namespaceResolver.resolve();
    const trackerFileContent = await this.noticesMetadataFile.read();
    for (const notice of notices) {
      const trackerItem = trackerFileContent.printTimes.find((item) => {
        return item.noticeId === notice.id && item.projectName === projectName;
      });
      if (trackerItem) {
        trackerItem.shownAt = Date.now();
      } else {
        trackerFileContent.printTimes.push({
          projectName,
          noticeId: notice.id,
          shownAt: Date.now(),
        });
      }
    }
    await this.noticesMetadataFile.write(trackerFileContent);
  };

  private filterAcknowledgedNotices = async (
    notices: Array<Notice>,
  ): Promise<Array<Notice>> => {
    const filteredNotices: Array<Notice> = [];
    const acknowledgementFileContent =
      await this.noticesAcknowledgementFile.read();
    const projectName = await this.namespaceResolver.resolve();
    for (const notice of notices) {
      const isAcknowledged: boolean =
        acknowledgementFileContent.projectAcknowledgements.find((ack) => {
          return ack.projectName === projectName && ack.noticeId === notice.id;
        }) !== undefined;
      if (!isAcknowledged) {
        filteredNotices.push(notice);
      }
    }
    return filteredNotices;
  };

  private applyPredicates = async (
    notices: Array<Notice>,
    opts: NoticesRendererParams,
  ): Promise<Array<Notice>> => {
    const filteredNotices: Array<Notice> = [];
    for (const notice of notices) {
      if (await this.noticePredicatesEvaluator.evaluate(notice, opts)) {
        filteredNotices.push(notice);
      }
    }
    return filteredNotices;
  };
}
