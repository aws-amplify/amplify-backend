import fsp from 'fs/promises';
import path from 'path';

/**
 * Renders index file of test project
 */
export class IndexFileRenderer {
  /**
   * Creates renderer
   */
  constructor(
    private readonly projectPath: string,
    private readonly latestUsagePath: string,
    private readonly baselineUsagePath: string
  ) {}

  render = async () => {
    await fsp.writeFile(
      path.join(this.projectPath, 'index.ts'),
      `
// this adds a compile-time constraint on the generics
type NestedAssignable<T, F extends T> = never;

type NoBreakingChanges = NestedAssignable<
    Pick<typeof import('${this.latestUsagePath}'), keyof typeof import('${this.baselineUsagePath}')>,
    typeof import('${this.baselineUsagePath}')
    >;
    `
    );
  };
}
