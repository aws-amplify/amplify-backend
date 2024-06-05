// namespace object imports won't work in the bundle for function exports
// eslint-disable-next-line @typescript-eslint/no-require-imports
import { LogLevel, Printer } from '@aws-amplify/cli-core';
import wrapAnsi from 'wrap-ansi';

/**
 * A class representing re-writable display lines
 */
export class RewritableBlock {
  private lastHeight = 0;
  private trailingEmptyLines = 0;
  private printer: Printer;
  private resolveForWaitingForTheNextDisplay: (value: unknown) => void;
  private progressIndicatorForWaitingForDisplayUpdate:
    | Promise<void>
    | undefined;
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

    if (this.progressIndicatorForWaitingForDisplayUpdate) {
      // Stop the previous spinner
      this.resolveForWaitingForTheNextDisplay(true);
      await this.progressIndicatorForWaitingForDisplayUpdate;
    } else {
      // first time displaying the spinner. Hold on to the resolve promise to stop
      // spinner on the next display or at the end.
      
    }
    lines = terminalWrap(this.width, expandNewlines(lines));
    lines = lines.slice(
      0,
      getMaxBlockHeight(this.height, this.lastHeight, lines)
    );

    this.stream.write(cursorUp(this.lastHeight));
    for (const line of lines) {
      this.stream.write(cll() + line + '\n');
    }

    this.trailingEmptyLines = Math.max(0, this.lastHeight - lines.length);

    // Clear remainder of unwritten lines
    for (let i = 0; i < this.trailingEmptyLines; i++) {
      this.stream.write(cll() + '\n');
    }

    this.progressIndicatorForWaitingForDisplayUpdate = this.printer.indicateProgress('Deployment in progress...', async () => {
      await new Promise((resolve) => {
        this.resolveForWaitingForTheNextDisplay = resolve;
      });;
    });
    // The block can only ever get bigger
    this.lastHeight = Math.max(this.lastHeight, lines.length);
  }

  /**
   * TBD
   */
  async removeEmptyLines() {
    if (this.progressIndicatorForWaitingForDisplayUpdate) {
      this.resolveForWaitingForTheNextDisplay(true);
      await this.progressIndicatorForWaitingForDisplayUpdate;
    }
    this.stream.write(cursorUp(this.trailingEmptyLines));
  }
}

const ESC = '\u001b';

/*
 * Move cursor up `n` lines. Default is 1
 */
const cursorUp = (n: number) => {
  n = typeof n === 'number' ? n : 1;
  return n > 0 ? ESC + '[' + n + 'A' : '';
};

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
