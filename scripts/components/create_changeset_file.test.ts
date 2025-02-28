import fsp from 'fs/promises';
import { beforeEach, describe, it, mock } from 'node:test';
import {
  BumpType,
  ChangesetFrontMatterContent,
  createChangesetFile,
} from './create_changeset_file.js';
import assert from 'assert';
import { EOL } from 'os';

void describe('createChangesetFile', () => {
  const mockedFspWriteFile = mock.method(fsp, 'writeFile', mock.fn());

  beforeEach(() => {
    mockedFspWriteFile.mock.resetCalls();
  });

  void it('successfully writes changeset file with front matter and summary', async () => {
    const testFileName = 'test.md';
    const frontMatterContents: ChangesetFrontMatterContent[] = [
      {
        packageName: 'test-packageA',
        bumpType: BumpType.MINOR,
      },
      {
        packageName: 'test-packageB',
        bumpType: BumpType.PATCH,
      },
    ];
    const summary = 'test summary';
    await createChangesetFile(testFileName, frontMatterContents, summary);
    const expectedContent = `---${EOL}'test-packageA': minor${EOL}'test-packageB': patch${EOL}---${EOL}${EOL}test summary${EOL}`;
    assert.strictEqual(mockedFspWriteFile.mock.callCount(), 1);
    assert.strictEqual(
      mockedFspWriteFile.mock.calls[0].arguments[0],
      testFileName
    );
    assert.deepStrictEqual(
      mockedFspWriteFile.mock.calls[0].arguments[1],
      expectedContent
    );
  });

  void it('successfully writes empty changeset file if there is no front matter provided', async () => {
    const testFileName = 'test.md';
    await createChangesetFile(testFileName, [], 'test summary');
    const expectedContent = `---${EOL}---${EOL}`;
    assert.strictEqual(mockedFspWriteFile.mock.callCount(), 1);
    assert.strictEqual(
      mockedFspWriteFile.mock.calls[0].arguments[0],
      testFileName
    );
    assert.deepStrictEqual(
      mockedFspWriteFile.mock.calls[0].arguments[1],
      expectedContent
    );
  });

  void it('successfully writes empty changeset file if there is no summary provided', async () => {
    const testFileName = 'test.md';
    const frontMatterContents: ChangesetFrontMatterContent[] = [
      {
        packageName: 'test-packageA',
        bumpType: BumpType.MINOR,
      },
      {
        packageName: 'test-packageB',
        bumpType: BumpType.PATCH,
      },
    ];
    await createChangesetFile(testFileName, frontMatterContents, '');
    const expectedContent = `---${EOL}---${EOL}`;
    assert.strictEqual(mockedFspWriteFile.mock.callCount(), 1);
    assert.strictEqual(
      mockedFspWriteFile.mock.calls[0].arguments[0],
      testFileName
    );
    assert.deepStrictEqual(
      mockedFspWriteFile.mock.calls[0].arguments[1],
      expectedContent
    );
  });
});
