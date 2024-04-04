import { $ as chainableExeca } from 'execa';
import { copyFile, writeFile } from 'fs/promises';
import { EOL } from 'os';

/**
 *
 */
export class NpmClient {
  /**
   * execaCommand that allows us to capture stdout
   */
  private readonly exec;

  /**
   * execaCommand that pipes buffers to process buffers
   */
  private readonly execWithIO;

  /**
   * Initialize the npm client with an optional directory to operate in.
   *
   * By default the client operates in the process cwd
   */
  constructor(private readonly npmToken: string | null, cwd?: string) {
    this.exec = chainableExeca({ cwd });
    this.execWithIO = this.exec({ stdio: 'inherit' });
  }

  deprecatePackage = async (
    packageVersionSpecifier: string,
    deprecationMessage: string
  ) => {
    await this
      .execWithIO`npm deprecate ${packageVersionSpecifier} "${deprecationMessage}"`;
  };

  unDeprecatePackage = async (packageVersionSpecifier: string) => {
    await this.execWithIO`npm deprecate ${packageVersionSpecifier} ""`;
  };

  setDistTag = async (packageVersionSpecifier: string, distTag: string) => {
    await this
      .execWithIO`npm dist-tag add ${packageVersionSpecifier} ${distTag}`;
  };

  getPackageVersionInfo = async (packageVersionSpecifier: string) => {
    const { stdout: jsonString } = await this
      .exec`npm show ${packageVersionSpecifier} --json`;
    return JSON.parse(jsonString) as Record<string, unknown>;
  };

  /**
   * Configure the .npmrc file with the provided npm token
   * If no token is specified, the .npmrc is configured for a local npm proxy
   */
  configureNpmRc = async () => {
    if (this.npmToken) {
      await writeFile(
        '.npmrc',
        // eslint-disable-next-line spellcheck/spell-checker
        `//registry.npmjs.org/:_authToken=${this.npmToken}${EOL}`
      );
    } else {
      // if there's no npm token, assume we are configuring for a local proxy
      // copy local config into .npmrc
      await copyFile('.npmrc.local', '.npmrc');
    }
  };
}

/**
 * Loads the github token from the GITHUB_TOKEN environment variable.
 * If not present, an error is thrown
 */
export const loadNpmTokenFromEnvVar = () => {
  const npmToken = process.env.NPM_TOKEN;
  if (!npmToken) {
    throw new Error(`
      The NPM access token must be set in the NPM_TOKEN environment variable.
    `);
  }
  return npmToken;
};
