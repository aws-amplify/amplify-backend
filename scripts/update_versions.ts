import { glob } from 'glob';
import fsp from 'fs/promises';
import { EOL } from 'os';
import path from 'path';

const packageJsonPaths = await glob('packages/*/package.json');

let changesetContent = `---${EOL}`;

for (const packageJsonPath of packageJsonPaths) {
  const packageJson = JSON.parse(await fsp.readFile(packageJsonPath, 'utf-8'));
  changesetContent += `'${packageJson.name as string}': patch${EOL}`;
}

changesetContent += `---${EOL}${EOL}`;

changesetContent += `Update version${EOL}`;

await fsp.writeFile(
  path.join('.changeset', 'force-version-bump.md'),
  changesetContent
);
