import { type SyncOptions, execaSync } from 'execa';

export const spawn = {
  sync: (bin: string, args: readonly string[], options: SyncOptions): void => {
    execaSync(bin, args, options);
  },
};
