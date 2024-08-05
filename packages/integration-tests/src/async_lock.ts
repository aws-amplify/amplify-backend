type LockQueueItem = {
  resolve: (value?: never) => void;
  timeoutResolve?: (value?: never) => void;
  timeout?: NodeJS.Timeout;
};

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
  private readonly queue: Array<LockQueueItem>;

  /**
   * Creates async lock.
   */
  constructor(private readonly defaultTimeoutMs?: number) {
    this.isLocked = false;
    this.queue = [];
  }

  acquire = async (timeoutMs?: number): Promise<void> => {
    let queueItem: LockQueueItem;
    const lockPromise = new Promise<void>((resolve) => {
      if (!this.isLocked) {
        this.isLocked = true;
        resolve();
      } else {
        queueItem = {
          resolve,
        };
        this.queue.push(queueItem);
      }
    });
    timeoutMs = timeoutMs ?? this.defaultTimeoutMs;
    if (timeoutMs) {
      const timeoutPromise = new Promise<void>((resolve, reject) => {
        queueItem.timeoutResolve = resolve;
        queueItem.timeout = setTimeout(
          () =>
            reject(
              new Error(`Unable to acquire async lock in ${timeoutMs}ms.`)
            ),
          timeoutMs
        );
      });
      return Promise.race<void>([lockPromise, timeoutPromise]);
    }
    return lockPromise;
  };

  release = (): void => {
    const queueItem = this.queue.shift();
    if (queueItem) {
      queueItem.resolve();
      if (queueItem.timeoutResolve) {
        // if timeout was set resolve related promise and clear timeout
        // so that it doesn't block node from exiting.
        queueItem.timeoutResolve();
        clearTimeout(queueItem.timeout);
      }
    } else {
      this.isLocked = false;
    }
  };
}
