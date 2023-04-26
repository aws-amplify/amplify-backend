import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Copies the templates/construct directory to a new package directory
 */
const main = async () => {
  const libName = process.argv[2];
  if (!libName) {
    throw new Error(
      'Specify a library name as the first and only argument to the program'
    );
  }

  const sourcePath = path.resolve(__dirname, '..', 'templates', 'construct');
  const destPath = path.resolve(__dirname, '..', 'packages', libName);

  await fs.copy(sourcePath, destPath);

  // substitute in the library name into the new package.json file
  const packageJsonPath = path.resolve(destPath, 'package.json');
  const tokenizedPackageJson = await fs.readFile(packageJsonPath, 'utf-8');
  const newPackageJson = tokenizedPackageJson.replaceAll(
    '{{libName}}',
    libName
  );
  await fs.writeFile(packageJsonPath, newPackageJson);

  // add an entry to the root package.json workspaces
  const rootPackageJsonPath = path.resolve(__dirname, '..', 'package.json');
  const rootPackageJson = await fs.readJSON(rootPackageJsonPath);
  rootPackageJson.workspaces.unshift(`packages/${libName}`);
  await fs.writeJSON(rootPackageJsonPath, rootPackageJson, { spaces: 2 });
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
