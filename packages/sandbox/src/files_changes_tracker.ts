import { glob } from 'glob';

export type FilesChangesTrackerSnapshot = {
  hadTypeScriptFilesAtStart: boolean;
  didAnyFileChangeSinceStart: boolean;
  didAnyTypeScriptFileChangeSinceLastSnapshot: boolean;
};

/**
 * This class accumulates information about files that have changed.
 */
export class FilesChangesTracker {
  /**
   * Creates a new file changes tracker.
   */
  constructor(private readonly snapshot: FilesChangesTrackerSnapshot) {}

  trackFileChange = (path: string) => {
    this.snapshot.didAnyFileChangeSinceStart = true;
    if (path.endsWith('.ts') || path.endsWith('.tsx')) {
      this.snapshot.didAnyTypeScriptFileChangeSinceLastSnapshot = true;
    }
  };

  getAndResetSnapshot = (): FilesChangesTrackerSnapshot => {
    // shallow copy is ok for 1 dim data structure
    const currentSnapshot = { ...this.snapshot };
    this.resetSnapshot();
    return currentSnapshot;
  };

  private resetSnapshot = () => {
    this.snapshot.didAnyTypeScriptFileChangeSinceLastSnapshot = false;
  };
}

/**
 * Creates a new instance of files changes tracker.
 */
export const createFilesChangesTracker = async (
  rootPath: string
): Promise<FilesChangesTracker> => {
  const tsFiles = await glob('**/*.{ts,tsx}', {
    ignore: 'node_modules/**',
    cwd: rootPath,
  });
  return new FilesChangesTracker({
    didAnyFileChangeSinceStart: false,
    hadTypeScriptFilesAtStart: tsFiles.length > 0,
    didAnyTypeScriptFileChangeSinceLastSnapshot: false,
  });
};
