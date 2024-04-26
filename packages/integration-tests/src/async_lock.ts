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
  constructor(private readonly defaultTimeoutMs?: number) {
    this.isLocked = false;
    this.queue = [];
  }

  acquire = async (timeoutMs?: number): Promise<void> => {
    const lockPromise = new Promise<void>((resolve) => {
      if (!this.isLocked) {
        this.isLocked = true;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
    timeoutMs = timeoutMs ?? this.defaultTimeoutMs;
    if (timeoutMs) {
      const timeoutPromise = new Promise<void>((resolve, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(`Unable to acquire async lock in ${timeoutMs}ms.`)
            ),
          timeoutMs
        )
      );
      return Promise.race<void>([lockPromise, timeoutPromise]);
    }
    return lockPromise;
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
