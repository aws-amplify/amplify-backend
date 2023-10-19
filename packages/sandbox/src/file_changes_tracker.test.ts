import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { FileChangesTracker } from './file_changes_tracker.js';

void describe('File changes tracker', () => {
  let tracker: FileChangesTracker;
  beforeEach(() => {
    tracker = new FileChangesTracker();
  });

  void it('counts non typescript file change', () => {
    tracker.trackFileChange('/foo/bar.txt');

    const summary = tracker.getSummaryAndReset();

    assert.strictEqual(summary.filesChanged, 1);
    assert.strictEqual(summary.typeScriptFilesChanged, 0);
  });

  void it('counts typescript file change', () => {
    tracker.trackFileChange('/foo/bar.ts');

    const summary = tracker.getSummaryAndReset();

    assert.strictEqual(summary.filesChanged, 1);
    assert.strictEqual(summary.typeScriptFilesChanged, 1);
  });

  void it('aggregates counts', () => {
    tracker.trackFileChange('/foo/bar.ts');
    tracker.trackFileChange('/foo/bar.ts');
    tracker.trackFileChange('/foo/baz.txt');
    tracker.trackFileChange('/foo/baz.txt');
    tracker.trackFileChange('/foo/baz.txt');

    const summary = tracker.getSummaryAndReset();
    assert.strictEqual(summary.filesChanged, 5);
    assert.strictEqual(summary.typeScriptFilesChanged, 2);
  });

  void it('resets counts', () => {
    tracker.trackFileChange('/foo/bar.ts');
    tracker.trackFileChange('/foo/baz.txt');

    tracker.reset();

    const summary = tracker.getSummaryAndReset();
    assert.strictEqual(summary.filesChanged, 0);
    assert.strictEqual(summary.typeScriptFilesChanged, 0);
  });

  void it('resets counts when obtaining summary', () => {
    tracker.trackFileChange('/foo/bar.ts');
    tracker.trackFileChange('/foo/baz.txt');

    tracker.getSummaryAndReset();

    const summary = tracker.getSummaryAndReset();
    assert.strictEqual(summary.filesChanged, 0);
    assert.strictEqual(summary.typeScriptFilesChanged, 0);
  });
});
