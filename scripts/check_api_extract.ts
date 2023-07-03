import { execa } from 'execa';
import { glob } from 'glob';
import { readFile } from 'fs/promises';

const ERROR_TOKENS = ['ae-forgotten-export'];

// first collect the names of files that have been changed, so we can filter out excluded files
const { stdout: gitDiffFiles } = await execa('git', ['diff', '--name-only']);
const updatedAPIFiles = gitDiffFiles
  .toString()
  .split('\n')
  .filter((file) => file.includes('API.md'));

if (updatedAPIFiles.length > 0) {
  throw new Error(
    `Expected no API.md file updates but found ${updatedAPIFiles}\nRun 'npm run update:api' and commit the updates to fix.`
  );
}

const allApiExtractFiles = await glob('packages/*/API.md');
const errors: string[] = [];
const scanPromises = allApiExtractFiles.map(async (apiExtractFile) => {
  const apiExtract = await readFile(apiExtractFile, 'utf-8');
  ERROR_TOKENS.forEach((token) => {
    if (apiExtract.includes(token)) {
      errors.push(`Found error token [${token}] in ${apiExtractFile}`);
    }
  });
});
await Promise.all(scanPromises);
if (errors.length > 0) {
  const errorMessagePrefix = `Problems found in API.md files.\nFix these issues and regenerate the API.md files using 'npm run update:api'`;
  throw new Error(`${errorMessagePrefix}\n${errors.join('\n')}`);
}
