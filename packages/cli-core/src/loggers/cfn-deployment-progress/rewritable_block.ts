import wrapAnsi from 'wrap-ansi';
import { AmplifyIOHost } from '@aws-amplify/plugin-types';
import { amplifyIOEventsBridgeFactory } from '../amplify_io_events_bridge_singleton_factory.js';

/**
 * A class representing re-writable display lines
 */
export class RewritableBlock {
  private lastHeight = 0;
  private trailingEmptyLines = 0;
  /**
   * TBD
   */
  constructor(
    private readonly getBlockWidth: () => number,
    private readonly getBlockHeight: () => number,
    private readonly ioHost: AmplifyIOHost = amplifyIOEventsBridgeFactory.getInstance()
  ) {}

  /**
   * TBD
   */
  async displayLines(lines: string[]) {
    lines = this.terminalWrap(this.getBlockWidth(), this.expandNewlines(lines));
    lines = lines.slice(
      0,
      this.getMaxBlockHeight(this.getBlockHeight(), this.lastHeight, lines)
    );

    const progressUpdate: string[] = [];
    for (const line of lines) {
      progressUpdate.push(this.cll() + line + '\n');
    }

    this.trailingEmptyLines = Math.max(0, this.lastHeight - lines.length);

    // Clear remainder of unwritten lines
    for (let i = 0; i < this.trailingEmptyLines; i++) {
      progressUpdate.push(this.cll() + '\n');
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
   * Clear to end of line
   */
  cll = () => {
    return '\u001b[K';
  };

  terminalWrap = (width: number | undefined, lines: string[]) => {
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
  expandNewlines = (lines: string[]): string[] => {
    return lines.flatMap((line) => line.split('\n'));
  };

  getMaxBlockHeight = (
    windowHeight: number | undefined,
    lastHeight: number,
    lines: string[]
  ): number => {
    if (windowHeight === undefined) {
      return Math.max(lines.length, lastHeight);
    }
    return lines.length < windowHeight ? lines.length : windowHeight - 1;
  };
}
