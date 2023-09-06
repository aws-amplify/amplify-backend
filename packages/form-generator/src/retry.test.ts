import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import { retry } from './retry.js';

describe('retry module', () => {
  it('retries a rejected promise', async () => {
    const retries = 3;
    const mockPromiseExecutor = mock.fn(() => Promise.reject());

    await assert.rejects(() => retry(mockPromiseExecutor, retries, 5));
    assert.equal(mockPromiseExecutor.mock.callCount(), retries);
  });
  it('does not retry if it succeeds', async () => {
    const retries = 3;
    const expectedResult = 0;
    const mockPromiseExecutor = mock.fn(() => Promise.resolve(expectedResult));
    mockPromiseExecutor.mock.mockImplementationOnce(() => Promise.reject());
    const result = await retry(mockPromiseExecutor, retries, 10);
    assert.equal(mockPromiseExecutor.mock.callCount(), 2);
    assert.equal(result, expectedResult);
  });
  it('returns the resolved value', async () => {
    const retries = 3;
    const expectedResult = 0;
    const mockPromiseExecutor = mock.fn(() => Promise.resolve(expectedResult));
    const result = await retry(mockPromiseExecutor, retries, 10);
    assert.equal(mockPromiseExecutor.mock.callCount(), 1);
    assert.equal(result, expectedResult);
  });
});
