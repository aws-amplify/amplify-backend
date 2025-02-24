import wrapAnsi from 'wrap-ansi';
import { LogLevel, Printer } from '../../printer/printer.js';

/**
 * A class representing re-writable display lines
 */
export class RewritableBlock {
  private lastHeight = 0;
  private trailingEmptyLines = 0;
  private printer: Printer;
  /**
   * TBD
   */
  constructor(private readonly stream: NodeJS.WriteStream) {
    this.printer = new Printer(LogLevel.INFO, this.stream);
  }

  /**
   * TBD
   */
  get width() {
    // Might get changed if the user re-sizes the terminal
    return this.stream.columns;
  }

  /**
   * TBD
   */
  get height() {
    // Might get changed if the user re-sizes the terminal
    return this.stream.rows;
  }

  /**
   * TBD
   */
  async displayLines(lines: string[]) {
    lines = terminalWrap(this.width, expandNewlines(lines));
    lines = lines.slice(
      0,
      getMaxBlockHeight(this.height, this.lastHeight, lines)
    );

    const progressUpdate: string[] = [];
    for (const line of lines) {
      progressUpdate.push(cll() + line + '\n');
    }

    this.trailingEmptyLines = Math.max(0, this.lastHeight - lines.length);

    // Clear remainder of unwritten lines
    for (let i = 0; i < this.trailingEmptyLines; i++) {
      progressUpdate.push(cll() + '\n');
    }

    // The block can only ever get bigger
    this.printer.updateSpinner('CFN_DEPLOYMENT_PROGRESS', {
      prefixText: progressUpdate.join(''),
    });

    this.lastHeight = Math.max(this.lastHeight, lines.length);
  }

  /**
   * TBD
   */
  stop() {
    this.printer.stopSpinner('CFN_DEPLOYMENT_PROGRESS');
  }

  /**
   * TBD
   */
  start() {
    this.printer.startSpinner(
      'CFN_DEPLOYMENT_PROGRESS',
      'Deployment in progress...'
    );
  }
}

const ESC = '\u001b';

/**
 * Clear to end of line
 */
const cll = () => {
  return ESC + '[K';
};

const terminalWrap = (width: number | undefined, lines: string[]) => {
  if (width === undefined) {
    return lines;
  }

  return lines.flatMap((line) =>
    wrapAnsi(line, width - 1, {
      hard: true,
      trim: true,
      wordWrap: false,
    }).split('\n')
  );
};

/**
 * Make sure there are no hidden newlines in the gin strings
 */
const expandNewlines = (lines: string[]): string[] => {
  return lines.flatMap((line) => line.split('\n'));
};

const getMaxBlockHeight = (
  windowHeight: number | undefined,
  lastHeight: number,
  lines: string[]
): number => {
  if (windowHeight === undefined) {
    return Math.max(lines.length, lastHeight);
  }
  return lines.length < windowHeight ? lines.length : windowHeight - 1;
};
