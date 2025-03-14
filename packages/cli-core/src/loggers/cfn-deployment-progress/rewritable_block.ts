import wrapAnsi from 'wrap-ansi';
import { AmplifyIOHost } from '@aws-amplify/plugin-types';
import { EOL } from 'os';

/**
 * A class representing re-writable display lines
 */
export class RewritableBlock {
  private lastHeight = 0;
  private trailingEmptyLines = 0;

  /**
   * Constructor for RewritableBlock
   * @param getBlockWidth A function that returns the width of the block
   * @param getBlockHeight A function that returns the height of the block
   * @param ioHost to send new updates to display
   */
  constructor(
    private readonly getBlockWidth: () => number,
    private readonly getBlockHeight: () => number,
    private readonly ioHost: AmplifyIOHost,
  ) {}

  /**
   * Display the given lines in this rewritable block. It expands to make room for more lines
   * and keep the size of the block constant until finished.
   */
  async displayLines(lines: string[]) {
    lines = this.terminalWrap(this.getBlockWidth(), this.expandNewlines(lines));
    lines = lines.slice(
      0,
      this.getMaxBlockHeight(this.getBlockHeight(), this.lastHeight, lines),
    );

    const progressUpdate: string[] = [];
    for (const line of lines) {
      progressUpdate.push(this.cll() + line + EOL);
    }

    this.trailingEmptyLines = Math.max(0, this.lastHeight - lines.length);

    // Clear remainder of unwritten lines
    for (let i = 0; i < this.trailingEmptyLines; i++) {
      progressUpdate.push(this.cll() + EOL);
    }

    await this.ioHost.notify({
      message: progressUpdate.join(''),
      code: 'AMPLIFY_CFN_PROGRESS_UPDATE',
      time: new Date(),
      action: 'amplify',
      level: 'info',
    });

    this.lastHeight = Math.max(this.lastHeight, lines.length);
  }

  /**
   * Clear to the end of line
   */
  cll = () => {
    return '\x1B[K';
  };

  /**
   * Wrap extra long lines while still being in the rewritable block
   */
  terminalWrap = (width: number | undefined, lines: string[]) => {
    if (width === undefined) {
      return lines;
    }

    return lines.flatMap((line) =>
      wrapAnsi(line, width - 1, {
        hard: true,
        trim: true,
        wordWrap: false,
      }).split(EOL),
    );
  };

  /**
   * Make sure there are no hidden newlines in the input strings
   */
  expandNewlines = (lines: string[]): string[] => {
    return lines.flatMap((line) => line.split(EOL));
  };

  getMaxBlockHeight = (
    windowHeight: number | undefined,
    lastHeight: number,
    lines: string[],
  ): number => {
    if (windowHeight === undefined) {
      return Math.max(lines.length, lastHeight);
    }
    return lines.length < windowHeight ? lines.length : windowHeight - 1;
  };
}
