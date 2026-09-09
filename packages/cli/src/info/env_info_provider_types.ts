// Types in this file are for return type from 'envinfo' package. We don't own schema.
/* eslint-disable @typescript-eslint/naming-convention */
export type EnvInfoBinary = {
  version: string;
  path: string;
};

export type EnvInfoNpmPackage =
  | {
      wanted: string;
      installed: string;
    }
  | string;

export type EnvInfo = {
  System: {
    OS: string;
    CPU: string;
    Memory: string;
    Shell: EnvInfoBinary;
  };
  Binaries: {
    Node: EnvInfoBinary;
    Yarn: EnvInfoBinary;
    npm: EnvInfoBinary;
    pnpm: EnvInfoBinary;
  };
  npmPackages: Record<string, EnvInfoNpmPackage>;
};
