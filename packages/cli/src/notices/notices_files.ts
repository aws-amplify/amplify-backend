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

export const noticesAcknowledgementFileInstance =
  typedConfigurationFileFactory.getInstance(
    'notices_acknowledgments.json',
    acknowledgementFileSchema,
    {
      projectAcknowledgements: [],
    },
  );

const noticesMetadataSchema = z.object({
  printTimes: z.array(
    z.object({
      projectName: z.string(),
      noticeId: z.string(),
      shownAt: z.number(),
    }),
  ),
  manifestCache: z.object({
    noticesManifest: noticesManifestSchema,
    refreshedAt: z.number(),
  }),
});

export const noticesMetadataFileInstance =
  typedConfigurationFileFactory.getInstance(
    'notices_metadata.json',
    noticesMetadataSchema,
    {
      printTimes: [],
      manifestCache: {
        noticesManifest: { notices: [] },
        // stale
        refreshedAt: 0,
      },
    },
  );
