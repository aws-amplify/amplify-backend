import { Notice } from '@aws-amplify/cli-core';
import { NoticesManifestFetcher } from './notices_manifest_fetcher.js';
import {
  PackageJsonReader,
  typedConfigurationFileFactory,
} from '@aws-amplify/platform-core';
import {
  LocalNamespaceResolver,
  NamespaceResolver,
} from '../backend-identifier/local_namespace_resolver.js';
import { NoticePredicatesEvaluator } from './notice_predictes_evaluator.js';
import { PackageManagerController } from '@aws-amplify/plugin-types';
import { NoticesRendererParams } from './notices_renderer.js';
import { z } from 'zod';

const acknowledgementFileSchema = z.object({
  projectAcknowledgements: z.array(
    z.object({
      projectName: z.string(),
      noticeId: z.string(),
      acknowledgedAt: z.number(),
    }),
  ),
});

const acknowledgementFileInstance = typedConfigurationFileFactory.getInstance(
  'notices_acknowledgments.json',
  acknowledgementFileSchema,
  {
    projectAcknowledgements: [],
  },
);

/**
 * A notices controller.
 */
export class NoticesController {
  /**
   * Creates notices controller.
   */
  constructor(
    packageManagerController: PackageManagerController,
    private readonly acknowledgementFile = acknowledgementFileInstance,
    private readonly namespaceResolver: NamespaceResolver = new LocalNamespaceResolver(
      new PackageJsonReader(),
    ),
    private readonly noticesManifestFetcher = new NoticesManifestFetcher(),
    private readonly noticePredicatesEvaluator = new NoticePredicatesEvaluator(
      packageManagerController,
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
    const acknowledgementFileContent = await this.acknowledgementFile.read();
    acknowledgementFileContent.projectAcknowledgements.push({
      projectName: await this.namespaceResolver.resolve(),
      noticeId,
      acknowledgedAt: Date.now(),
    });
    await this.acknowledgementFile.write(acknowledgementFileContent);
  };

  private filterAcknowledgedNotices = async (
    notices: Array<Notice>,
  ): Promise<Array<Notice>> => {
    const filteredNotices: Array<Notice> = [];
    const acknowledgementFileContent = await this.acknowledgementFile.read();
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
      if (
        await this.noticePredicatesEvaluator.evaluate(notice.predicates, opts)
      ) {
        filteredNotices.push(notice);
      }
    }
    return filteredNotices;
  };
}
