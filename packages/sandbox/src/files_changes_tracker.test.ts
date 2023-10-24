import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { FilesChangesTracker } from './files_changes_tracker.js';

void describe('File changes tracker', () => {
  let tracker: FilesChangesTracker;
  beforeEach(() => {
    tracker = new FilesChangesTracker({
      didAnyFileChangeSinceStart: false,
      hadTypeScriptFilesAtStart: true,
      didAnyTypeScriptFileChangeSinceLastSnapshot: false,
    });
  });

  void it('counts non typescript file change', () => {
    tracker.trackFileChange('/foo/bar.txt');

    const snapshot = tracker.getAndResetSnapshot();

    assert.strictEqual(snapshot.hadTypeScriptFilesAtStart, true);
    assert.strictEqual(snapshot.didAnyFileChangeSinceStart, true);
    assert.strictEqual(
      snapshot.didAnyTypeScriptFileChangeSinceLastSnapshot,
      false
    );
  });

  void it('counts typescript file change', () => {
    tracker.trackFileChange('/foo/bar.ts');

    const snapshot = tracker.getAndResetSnapshot();

    assert.strictEqual(snapshot.hadTypeScriptFilesAtStart, true);
    assert.strictEqual(snapshot.didAnyFileChangeSinceStart, true);
    assert.strictEqual(
      snapshot.didAnyTypeScriptFileChangeSinceLastSnapshot,
      true
    );
  });

  void it('counts tsx file change', () => {
    tracker.trackFileChange('/foo/bar.tsx');

    const snapshot = tracker.getAndResetSnapshot();

    assert.strictEqual(snapshot.hadTypeScriptFilesAtStart, true);
    assert.strictEqual(snapshot.didAnyFileChangeSinceStart, true);
    assert.strictEqual(
      snapshot.didAnyTypeScriptFileChangeSinceLastSnapshot,
      true
    );
  });

  void it('aggregates counts', () => {
    tracker.trackFileChange('/foo/bar.ts');
    tracker.trackFileChange('/foo/bar.ts');
    tracker.trackFileChange('/foo/baz.txt');
    tracker.trackFileChange('/foo/baz.txt');
    tracker.trackFileChange('/foo/baz.txt');

    const snapshot = tracker.getAndResetSnapshot();

    assert.strictEqual(snapshot.hadTypeScriptFilesAtStart, true);
    assert.strictEqual(snapshot.didAnyFileChangeSinceStart, true);
    assert.strictEqual(
      snapshot.didAnyTypeScriptFileChangeSinceLastSnapshot,
      true
    );
  });

  void it('resets snapshot counts', () => {
    tracker.trackFileChange('/foo/bar.ts');
    tracker.trackFileChange('/foo/baz.txt');

    tracker.getAndResetSnapshot();

    const snapshot = tracker.getAndResetSnapshot();

    assert.strictEqual(snapshot.hadTypeScriptFilesAtStart, true);
    assert.strictEqual(snapshot.didAnyFileChangeSinceStart, true);
    assert.strictEqual(
      snapshot.didAnyTypeScriptFileChangeSinceLastSnapshot,
      false
    );
  });
});
