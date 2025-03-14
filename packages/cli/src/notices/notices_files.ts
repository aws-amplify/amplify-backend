import { typedConfigurationFileFactory } from '@aws-amplify/platform-core';
import { z } from 'zod';
import { noticesManifestSchema } from '@aws-amplify/cli-core';

const acknowledgementFileSchema = z.object({
  projectAcknowledgements: z.array(
    z.object({
      projectName: z.string(),
      noticeId: z.string(),
      acknowledgedAt: z.number(),
    }),
  ),
});

export const acknowledgementFileInstance =
  typedConfigurationFileFactory.getInstance(
    'notices_acknowledgments.json',
    acknowledgementFileSchema,
    {
      projectAcknowledgements: [],
    },
  );

const noticesManifestCacheSchema = z.object({
  noticesManifest: noticesManifestSchema,
  refreshedAt: z.number(),
});

export const fileCacheInstance = typedConfigurationFileFactory.getInstance(
  'notices_manifest_cache.json',
  noticesManifestCacheSchema,
  {
    noticesManifest: { notices: [] },
    // stale
    refreshedAt: 0,
  },
);

const noticesPrintingTrackerSchema = z.object({
  printTimes: z.array(
    z.object({
      projectName: z.string(),
      noticeId: z.string(),
      shownAt: z.number(),
    }),
  ),
});

export const noticesPrintingTrackerFileInstance =
  typedConfigurationFileFactory.getInstance(
    'notices_printing_tracker.json',
    noticesPrintingTrackerSchema,
    {
      printTimes: [],
    },
  );
