import { z } from 'zod';
import { BackendOutputEntry } from '@aws-amplify/plugin-types';

export const dataOutputSchema = z.object({
  appSyncApiEndpoint: z.string(),
  appSyncApiKey: z.string().optional(),
});

export type DataOutputType = z.infer<typeof dataOutputSchema>;

/**
 * Backend outputs from Data
 */
export class DataOutput implements BackendOutputEntry<DataOutputType> {
  readonly schemaIdentifier = {
    schemaName: 'DataOutput',
    schemaVersion: 1,
  };

  /**
   * Internal constructor
   */
  private constructor(readonly payload: DataOutputType) {}

  /**
   * Construct a DataOutput instance with runtime validation of the dataOutput shape
   */
  static fromDataOutput(dataOutput: DataOutputType) {
    return new DataOutput(dataOutputSchema.parse(dataOutput));
  }
}
