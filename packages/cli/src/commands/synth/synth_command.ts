import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { BackendDeployer } from '@aws-amplify/backend-deployer';
import { ArgumentsKebabCase } from '../../kebab_case.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { printer } from '@aws-amplify/cli-core';
import * as fs from 'fs';
import * as path from 'path';

export type SynthCommandOptions =
  ArgumentsKebabCase<SynthCommandOptionsCamelCase>;

type SynthCommandOptionsCamelCase = {
  branch: string;
  appId: string;
  out: string;
};

/**
 * An entry point for synth command.
 */
export class SynthCommand implements CommandModule<
  object,
  SynthCommandOptions
> {
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  /**
   * Creates top level entry point for synth command.
   */
  constructor(
    private readonly backendDeployer: BackendDeployer,
    private readonly fsCopyDir: (src: string, dest: string) => Promise<void> = (
      src,
      dest,
    ) => fs.promises.cp(src, dest, { recursive: true }),
  ) {
    this.command = 'synth';
    this.describe =
      'Synthesizes CloudFormation templates without deploying, enabling deployment via external tools.';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<SynthCommandOptions>,
  ): Promise<void> => {
    const backendId: BackendIdentifier = {
      namespace: args.appId,
      name: args.branch,
      type: 'branch',
    };
    const result = await this.backendDeployer.synth(backendId, {
      validateAppSources: true,
    });

    const outDir = path.resolve(args.out);

    // Clear output directory to prevent stale artifacts
    if (fs.existsSync(outDir)) {
      await fs.promises.rm(outDir, { recursive: true, force: true });
    }
    await fs.promises.mkdir(outDir, { recursive: true });

    try {
      await this.fsCopyDir(result.cloudAssemblyPath, outDir);
      printer.print(
        `Synthesized CloudFormation template(s) written to ${outDir}`,
      );
    } catch (error) {
      throw new AmplifyUserError(
        'SynthOutputCopyError',
        {
          message: `Failed to copy synthesized templates to ${outDir}`,
          resolution:
            'Check that the output directory is writable and has sufficient disk space.',
        },
        error as Error,
      );
    }
  };

  builder = (yargs: Argv): Argv<SynthCommandOptions> => {
    return yargs
      .version(false)
      .option('branch', {
        describe: 'Name of the git branch being synthesized',
        demandOption: true,
        type: 'string',
        array: false,
      })
      .option('app-id', {
        describe: 'The app id of the target Amplify app',
        demandOption: true,
        type: 'string',
        array: false,
      })
      .option('out', {
        describe:
          'Output directory for synthesized CloudFormation templates. Defaults to ./cdk.out.',
        demandOption: false,
        type: 'string',
        array: false,
        default: './cdk.out',
      })
      .check(async (argv) => {
        if (argv['branch'].length === 0) {
          throw new AmplifyUserError('InvalidCommandInputError', {
            message: 'Invalid --branch',
            resolution: '--branch must be at least 1 character',
          });
        }
        if (argv['app-id'].length === 0) {
          throw new AmplifyUserError('InvalidCommandInputError', {
            message: 'Invalid --app-id',
            resolution: '--app-id must be at least 1 character',
          });
        }
        return true;
      });
  };
}
