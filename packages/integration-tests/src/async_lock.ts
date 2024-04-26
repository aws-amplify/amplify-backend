/**
 * Example usage:
 * const myLock = new AsyncLock();
 *
 * async function asyncFunction() {
 *     await myLock.acquire();
 *     try {
 *         // Code that requires exclusive access to a shared resource
 *         console.log('Accessing shared resource...');
 *         await someAsyncOperation();
 *     } finally {
 *         myLock.release();
 *     }
 * }
 *
 * asyncFunction();
 */
export class AsyncLock {
  private isLocked: boolean;
  private readonly queue: Array<(value?: never) => void>;

  /**
   * Creates async lock.
   */
  constructor() {
    this.isLocked = false;
    this.queue = [];
  }

  acquire = async (): Promise<void> => {
    return new Promise<void>((resolve) => {
      if (!this.isLocked) {
        this.isLocked = true;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  };

  release = (): void => {
    const resolve = this.queue.shift();
    if (resolve) {
      resolve();
    } else {
      this.isLocked = false;
    }
  };
}
