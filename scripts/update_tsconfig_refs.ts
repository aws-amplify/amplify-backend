/**
 * Scans the package.json files of packages in the repo and configures the references field in the tsconfig.json files accordingly
 * Keeping the tsconfig.json references in sync with package.json changes ensures that TS incremental builds work properly when changes touch multiple packages
 */
import { globSync } from 'glob';
import * as fs from 'fs';
import * as path from 'path';

type PackageInfo = {
  packageJsonPath: string;
  packageJson: Record<string, unknown>;
  tsconfigPath: string;
  tsconfig: Record<string, unknown>;
  relativeReferencePath: string;
};

const main = async () => {
  const packagePaths = globSync('./packages/*');

  const repoPackagesInfoRecord: Record<string, PackageInfo> = {};

  packagePaths.forEach((packagePath) => {
    const packageJsonPath = path.resolve(packagePath, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const tsconfigPath = path.resolve(packagePath, 'tsconfig.json');
    const packageDirName = packagePath.split(path.sep).reverse()[0];
    const relativeReferencePath = path.join('..', packageDirName);

    repoPackagesInfoRecord[packageJson.name] = {
      packageJsonPath,
      packageJson,
      tsconfigPath,
      tsconfig: JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8')),
      relativeReferencePath,
    };
  });

  Object.values(repoPackagesInfoRecord).forEach(
    ({ packageJson, tsconfig, tsconfigPath }) => {
      const allDeps = Array.from(
        new Set([
          ...Object.keys(packageJson.dependencies || {}),
          ...Object.keys(packageJson.devDependencies || {}),
          ...Object.keys(packageJson.peerDependencies || {}),
        ])
      );

      tsconfig.references = allDeps
        .filter((dep) => dep in repoPackagesInfoRecord)
        .reduce(
          (accumulator, dep) =>
            accumulator.concat({
              path: repoPackagesInfoRecord[dep].relativeReferencePath,
            }),
          []
        );
      fs.writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`);
    }
  );
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
