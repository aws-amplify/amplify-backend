import { glob } from 'glob';

export type FileCounters = {
  initialTypeScriptFilesCount: number;
  filesChanged: number;
  typeScriptFilesChangedSinceLastSnapshot: number;
};

/**
 * This class accumulates information about files that have changed.
 */
export class FileChangesTracker {
  /**
   * Creates a new file changes tracker.
   */
  constructor(private readonly counters: FileCounters) {}

  trackFileChange = (path: string) => {
    this.counters.filesChanged++;
    if (path.endsWith('.ts') || path.endsWith('.tsx')) {
      this.counters.typeScriptFilesChangedSinceLastSnapshot++;
    }
  };

  getSnapshot = (): FileCounters => {
    // shallow copy is ok for 1 dim data structure
    const countersSnapshot = { ...this.counters };
    this.resetSnapshotCounters();
    return countersSnapshot;
  };

  private resetSnapshotCounters = () => {
    this.counters.typeScriptFilesChangedSinceLastSnapshot = 0;
  };
}

/**
 * Creates a new instance of file changes tracker.
 */
export const createFileChangesTracker = async (
  rootPath: string
): Promise<FileChangesTracker> => {
  const tsFiles = await glob('**/*.{ts,tsx}', {
    ignore: 'node_modules/**',
    cwd: rootPath,
  });
  return new FileChangesTracker({
    filesChanged: 0,
    initialTypeScriptFilesCount: tsFiles.length,
    typeScriptFilesChangedSinceLastSnapshot: 0,
  });
};
