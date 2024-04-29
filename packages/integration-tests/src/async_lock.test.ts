import { describe, it } from 'node:test';
import { AsyncLock } from './async_lock.js';
import assert from 'assert';

void describe('AsyncLock', () => {
  const randomInteger = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };
  const doSomeWork = async (
    lock: AsyncLock,
    timeoutMs = randomInteger(1, 100)
  ) => {
    await lock.acquire();
    try {
      await new Promise((resolve) => setTimeout(resolve, timeoutMs));
    } finally {
      lock.release();
    }
  };

  void it('locks and unlocks in serialized access', async () => {
    const lock = new AsyncLock();
    await lock.acquire();
    lock.release();
    await lock.acquire();
    lock.release();
  });

  void it('can handle concurrent workers', async () => {
    const lock = new AsyncLock();
    const promises: Array<Promise<void>> = [];
    for (let i = 0; i < 10; i++) {
      promises.push(doSomeWork(lock));
    }
    await Promise.all(promises);
  });

  void it('errors on timeout', async () => {
    const lock = new AsyncLock();
    await lock.acquire();
    await assert.rejects(() => lock.acquire(10));
  });

  void it('errors on default timeout', async () => {
    const lock = new AsyncLock(10);
    await lock.acquire();
    await assert.rejects(() => lock.acquire());
  });
});
