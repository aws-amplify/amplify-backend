/**
 * Scans the package.json files of packages in the repo and configures the references field in the tsconfig.json files accordingly
 * Keeping the tsconfig.json references in sync with package.json changes ensures that TS incremental builds work properly when changes touch multiple packages
 */
import { globSync } from 'glob';
import * as fs from 'fs';
import * as path from 'path';
import prettier from 'prettier';

type PackageInfo = {
  packageJsonPath: string;
  packageJson: Record<string, unknown>;
  tsconfigPath: string;
  tsconfig: Record<string, unknown>;
  relativeReferencePath: string;
};

const main = async () => {
  const packagePaths = globSync('./packages/*');

  // First collect information about all of the packages in the repo
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

  // Iterate over all the packages
  const updatePromises = Object.values(repoPackagesInfoRecord).map(
    async ({ packageJson, tsconfig, tsconfigPath }) => {
      // collect all the dependencies for the package
      const allDeps = Array.from(
        new Set([
          ...Object.keys(packageJson.dependencies || {}),
          ...Object.keys(packageJson.devDependencies || {}),
          ...Object.keys(packageJson.peerDependencies || {}),
        ])
      );

      // construct the references array in tsconfig for inter-repo dependencies
      tsconfig.references = allDeps
        .filter((dep) => dep in repoPackagesInfoRecord)
        .reduce(
          (accumulator, dep) =>
            accumulator.concat({
              path: repoPackagesInfoRecord[dep].relativeReferencePath,
            }),
          []
        );

      // write out the tsconfig file using prettier formatting
      const prettierConfig = await prettier.resolveConfig(tsconfigPath);
      prettierConfig.parser = 'json';
      const formattedTsconfig = prettier.format(
        JSON.stringify(tsconfig),
        prettierConfig
      );
      fs.writeFileSync(tsconfigPath, formattedTsconfig);
    }
  );

  await Promise.all(updatePromises);
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
