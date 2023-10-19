export type FileChangesSummary = {
  filesChanged: number;
  typeScriptFilesChanged: number;
};

/**
 * This class accumulates information about files that have changed.
 */
export class FileChangesTracker {
  private summary: FileChangesSummary = {
    filesChanged: 0,
    typeScriptFilesChanged: 0,
  };

  trackFileChange = (path: string) => {
    this.summary.filesChanged++;
    if (path.endsWith('.ts') || path.endsWith('.tsx')) {
      this.summary.typeScriptFilesChanged++;
    }
  };

  getSummaryAndReset = () => {
    const currentSummary = this.summary;
    this.reset();
    return currentSummary;
  };

  reset = () => {
    this.summary = {
      filesChanged: 0,
      typeScriptFilesChanged: 0,
    };
  };
}
