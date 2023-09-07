export type GeneratedFormMetadata = {
  downloadUrl: string | undefined;
  fileName: string;
  schemaName: string;
  error: string | undefined;
};

/* eslint-disable @typescript-eslint/naming-convention */
export type Manifest = { Output: GeneratedFormMetadata[] };

export type DownloadResult = {
  content?: string;
  fileName: string;
};
