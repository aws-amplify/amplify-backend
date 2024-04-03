import { $ } from 'execa';
import { copyFile, writeFile } from 'fs/promises';
import { EOL } from 'os';

class NpmClient {
  // convenience config for execa;
  private readonly inheritIO = { stdio: 'inherit' } as const;

  deprecatePackage = async (
    packageVersionSpecifier: string,
    deprecationMessage: string
  ) => {
    await $(
      this.inheritIO
    )`npm deprecate ${packageVersionSpecifier} "${deprecationMessage}"`;
  };

  unDeprecatePackage = async (packageVersionSpecifier: string) => {
    await $(this.inheritIO)`npm deprecate ${packageVersionSpecifier} ""`;
  };

  setDistTag = async (packageVersionSpecifier: string, distTag: string) => {
    await $(
      this.inheritIO
    )`npm dist-tag add ${packageVersionSpecifier} ${distTag}`;
  };

  configureNpmRc = async ({
    target,
  }: {
    target: 'local-proxy' | 'npm-registry';
  }) => {
    switch (target) {
      case 'local-proxy': {
        // copy local config into .npmrc
        await copyFile('.npmrc.local', '.npmrc');
        break;
      }
      case 'npm-registry': {
        const npmToken = process.env.NPM_TOKEN;
        if (!npmToken) {
          throw new Error(`
            The NPM access token must be set in the NPM_TOKEN environment variable.
          `);
        }
        await writeFile(
          '.npmrc',
          // eslint-disable-next-line spellcheck/spell-checker
          `//registry.npmjs.org/:_authToken=${process.env.NPM_TOKEN}${EOL}`
        );
        break;
      }
    }
  };
}

/**
 * Client for programmatically interacting with the local npm CLI
 */
export const npmClient = new NpmClient();
