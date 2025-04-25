import z from 'zod';

const identifiersSchema = z.object({
  payloadVersion: z.string(),
  sessionUuid: z.string(),
  eventId: z.string(),
  timestamp: z.string(),
  localProjectId: z.string(),
  accountId: z.string().optional(),
  awsRegion: z.string().optional(),
});

const eventSchema = z.object({
  state: z.enum(['ABORTED', 'FAILED', 'SUCCEEDED']),
  command: z.object({
    path: z.array(z.string()),
    parameters: z.array(z.string()),
  }),
});

const environmentSchema = z.object({
  os: z.object({
    platform: z.string(),
    release: z.string(),
  }),
  shell: z.string(),
  npmUserAgent: z.string(),
  ci: z.boolean(),
  memory: z.object({
    total: z.number(),
    free: z.number(),
  }),
});

const projectSchema = z.object({
  dependencies: z
    .array(
      z.object({
        name: z.string(),
        version: z.string(),
      }),
    )
    .optional(),
});

const latencySchema = z.object({
  total: z.number(),
  init: z.number().optional(),
  synthesis: z.number().optional(),
  deployment: z.number().optional(),
  hotSwap: z.number().optional(),
});

export type ErrorDetails = {
  name: string;
  message: string;
  stack: string;
  caused?: ErrorDetails;
};

const errorSchema: z.ZodType<ErrorDetails> = z.lazy(() =>
  z.object({
    name: z.string(),
    message: z.string(),
    stack: z.string(),
    caused: z.optional(errorSchema), // Recursive reference
  }),
);

export const telemetryPayloadSchema = z.object({
  identifiers: identifiersSchema,
  event: eventSchema,
  environment: environmentSchema,
  project: projectSchema,
  latency: latencySchema,
  error: z.optional(errorSchema),
});

export type TelemetryPayload = z.infer<typeof telemetryPayloadSchema>;

export type TelemetryPayloadKeys = keyof TelemetryPayload;
