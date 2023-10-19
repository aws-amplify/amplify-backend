import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { FileChangesTracker } from './file_changes_tracker.js';

void describe('File changes tracker', () => {
  let tracker: FileChangesTracker;
  beforeEach(() => {
    tracker = new FileChangesTracker({
      filesChanged: 0,
      initialTypeScriptFilesCount: 14,
      typeScriptFilesChangedSinceLastSnapshot: 0,
    });
  });

  void it('counts non typescript file change', () => {
    tracker.trackFileChange('/foo/bar.txt');

    const counters = tracker.getSnapshot();

    assert.strictEqual(counters.initialTypeScriptFilesCount, 14);
    assert.strictEqual(counters.filesChanged, 1);
    assert.strictEqual(counters.typeScriptFilesChangedSinceLastSnapshot, 0);
  });

  void it('counts typescript file change', () => {
    tracker.trackFileChange('/foo/bar.ts');

    const counters = tracker.getSnapshot();

    assert.strictEqual(counters.initialTypeScriptFilesCount, 14);
    assert.strictEqual(counters.filesChanged, 1);
    assert.strictEqual(counters.typeScriptFilesChangedSinceLastSnapshot, 1);
  });

  void it('counts tsx file change', () => {
    tracker.trackFileChange('/foo/bar.tsx');

    const counters = tracker.getSnapshot();

    assert.strictEqual(counters.initialTypeScriptFilesCount, 14);
    assert.strictEqual(counters.filesChanged, 1);
    assert.strictEqual(counters.typeScriptFilesChangedSinceLastSnapshot, 1);
  });

  void it('aggregates counts', () => {
    tracker.trackFileChange('/foo/bar.ts');
    tracker.trackFileChange('/foo/bar.ts');
    tracker.trackFileChange('/foo/baz.txt');
    tracker.trackFileChange('/foo/baz.txt');
    tracker.trackFileChange('/foo/baz.txt');

    const counters = tracker.getSnapshot();

    assert.strictEqual(counters.initialTypeScriptFilesCount, 14);
    assert.strictEqual(counters.filesChanged, 5);
    assert.strictEqual(counters.typeScriptFilesChangedSinceLastSnapshot, 2);
  });

  void it('resets snapshot counts', () => {
    tracker.trackFileChange('/foo/bar.ts');
    tracker.trackFileChange('/foo/baz.txt');

    tracker.getSnapshot();

    const counters = tracker.getSnapshot();

    assert.strictEqual(counters.initialTypeScriptFilesCount, 14);
    assert.strictEqual(counters.filesChanged, 2);
    assert.strictEqual(counters.typeScriptFilesChangedSinceLastSnapshot, 0);
  });
});
