import { z } from 'zod';
import { geoOutputSchema as geoOutputSchemaV1 } from './v1';

export const versionedGeoOutputSchema = z.discriminatedUnion('version', [
  geoOutputSchemaV1,
]);

export type GeoOutput = z.infer<typeof versionedGeoOutputSchema>;
