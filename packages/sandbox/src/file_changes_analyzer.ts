export type FileChangesAnalysisSummary = {
  anyTypeScriptFileChanged: boolean;
};

/**
 * This class accumulates information about files that have changed.
 */
export class FileChangesAnalyzer {
  private summary: FileChangesAnalysisSummary;

  /**
   * Creates analyzer instance.
   */
  constructor() {
    this.reset();
  }

  onFileChange = (path: string) => {
    if (path.endsWith('.ts')) {
      this.summary.anyTypeScriptFileChanged = true;
    }
  };

  getSummaryAndReset = () => {
    const currentSummary = this.summary;
    this.reset();
    return currentSummary;
  };

  private reset = () => {
    this.summary = {
      anyTypeScriptFileChanged: false,
    };
  };
}
