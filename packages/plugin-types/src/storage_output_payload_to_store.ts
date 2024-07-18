export type StorageOutputPayloadToStore = Record<
  `storageRegion${string}` | `bucketName${string}`,
  string
>;
