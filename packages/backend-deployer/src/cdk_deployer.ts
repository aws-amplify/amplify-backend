import process from 'node:process';
import ts from 'typescript';
import * as fs from 'fs';
import {
  BackendDeployer,
  DeployProps,
} from './cdk_deployer_singleton_factory.js';
import { CdkErrorMapper } from './cdk_error_mapper.js';
import {
  AmplifyIOHost,
  BackendIdentifier,
  type PackageManagerController,
} from '@aws-amplify/plugin-types';
import {
  AmplifyError,
  AmplifyUserError,
  BackendLocator,
  CDKContextKey,
} from '@aws-amplify/platform-core';
import path from 'path';
import {
  HotswapMode,
  RequireApproval,
  StackSelectionStrategy,
  Toolkit,
} from '@aws-cdk/toolkit-lib';
import { tsImport } from 'tsx/esm/api';
import { CloudAssembly } from 'aws-cdk-lib/cx-api';
import { pathToFileURL } from 'url';
import { AssetStaging } from 'aws-cdk-lib/core';

/**
 * Invokes CDK command via execa
 */
export class CDKDeployer implements BackendDeployer {
  private readonly absoluteCloudAssemblyLocation = path.resolve(
    process.cwd(),
    '.amplify/artifacts/cdk.out',
  );

  /**
   * Instantiates instance of CDKDeployer
   */
  constructor(
    private readonly cdkErrorMapper: CdkErrorMapper,
    private readonly backendLocator: BackendLocator,
    private readonly packageManagerController: PackageManagerController,
    private readonly cdkToolkit: Toolkit,
    private readonly ioHost: AmplifyIOHost,
  ) {}

  /**
   * Invokes cdk deploy API
   */
  deploy = async (backendId: BackendIdentifier, deployProps?: DeployProps) => {
    // Hack?? CDK uses global asset cache that is not cleared if assets are
    // changing within the same process (which now happens with CDK Toolkit APIs)
    // See https://github.com/aws/aws-cdk-cli/issues/236
    AssetStaging.clearAssetHashCache();

    const cx = await this.getCdkCloudAssembly(
      backendId,
      deployProps?.secretLastUpdated?.getTime(),
    );
    // Initiate synth for the cloud executable and send a message for display.
    const synthStartTime = Date.now();
    let synthAssembly,
      synthError: Error | undefined = undefined;
    await this.ioHost.notify({
      message: `Backend synthesis started`,
      code: 'SYNTH_STARTED',
      action: 'amplify',
      time: new Date(),
      level: 'info',
      data: undefined,
    });

    try {
      synthAssembly = await this.cdkToolkit.synth(cx, {
        stacks: {
          strategy: StackSelectionStrategy.ALL_STACKS,
        },
      });
    } catch (error) {
      synthError = error as Error;
    }

    const synthTimeSeconds =
      Math.floor((Date.now() - synthStartTime) / 10) / 100;

    await this.ioHost.notify({
      message: `Backend synthesized in ${synthTimeSeconds} seconds`,
      code: 'SYNTH_FINISHED',
      action: 'amplify',
      time: new Date(),
      level: 'result',
      data: undefined,
    });

    // Typescript compilation. For type related errors, we prefer to show errors from TS to customers rather than synth
    const typeCheckStartTime = Date.now();
    await this.ioHost.notify({
      message: `Backend type checks started`,
      code: 'TS_STARTED',
      action: 'amplify',
      time: new Date(),
      level: 'info',
      data: undefined,
    });

    if (deployProps?.validateAppSources) {
      try {
        this.compileProject(path.dirname(this.backendLocator.locate()));
      } catch (typeError) {
        if (
          synthError &&
          AmplifyError.isAmplifyError(typeError) &&
          typeError.details &&
          typeError.details.match(
            /Cannot find module '\$amplify\/env\/.*' or its corresponding type declarations/,
          )
        ) {
          // synth has failed and we don't have auto generated function environment definition files. This
          // resulted in the exception caught here, which is not very useful for the customers.
          // We instead throw the synth error for customers to fix what caused the synth to fail.
          throw this.cdkErrorMapper.getAmplifyError(synthError);
        }
        throw typeError;
      } finally {
        const typeCheckTimeSeconds =
          Math.floor((Date.now() - typeCheckStartTime) / 10) / 100;
        await this.ioHost.notify({
          message: `Type checks completed in ${typeCheckTimeSeconds} seconds`,
          code: 'TS_FINISHED',
          action: 'amplify',
          time: new Date(),
          level: 'result',
          data: undefined,
        });
      }
    }

    // If typescript compilation was successful but synth had failed, we throw synth error
    if (synthError) {
      throw this.cdkErrorMapper.getAmplifyError(synthError);
    }

    // Perform actual deployment. CFN or hotswap
    const deployStartTime = Date.now();
    try {
      // await this.cdkToolkit.deploy(synthAssembly!, {
      //   stacks: {
      //     strategy: StackSelectionStrategy.ALL_STACKS,
      //   },
      //   hotswap:
      //     backendId.type === 'sandbox'
      //       ? HotswapMode.FALL_BACK
      //       : HotswapMode.FULL_DEPLOYMENT,
      //   ci: backendId.type !== 'sandbox',
      //   requireApproval:
      //     backendId.type !== 'sandbox' ? RequireApproval.NEVER : undefined,
      // });
    } catch (error) {
      throw this.cdkErrorMapper.getAmplifyError(error as Error);
    }

    return {
      deploymentTimes: {
        synthesisTime: synthTimeSeconds,
        totalTime:
          synthTimeSeconds +
          Math.floor((Date.now() - deployStartTime) / 10) / 100,
      },
    };
  };

  /**
   * Invokes cdk destroy API
   */
  destroy = async (backendId: BackendIdentifier) => {
    const deploymentStartTime = Date.now();
    await this.cdkToolkit.destroy(await this.getCdkCloudAssembly(backendId), {
      stacks: {
        strategy: StackSelectionStrategy.ALL_STACKS,
      },
    });
    return {
      deploymentTimes: {
        totalTime: Math.floor((Date.now() - deploymentStartTime) / 10) / 100,
      },
    };
  };

  /**
   * Build cloud executable from dynamically importing the cdk ts file, i.e. backend.ts
   */
  private getCdkCloudAssembly = (
    backendId: BackendIdentifier,
    secretLastUpdated?: number,
  ) => {
    const contextParams: {
      [key: string]: unknown;
    } = {};

    if (backendId.type === 'sandbox') {
      if (secretLastUpdated) {
        contextParams['secretLastUpdated'] = secretLastUpdated;
      }
    }

    contextParams[CDKContextKey.BACKEND_NAMESPACE] = backendId.namespace;
    contextParams[CDKContextKey.BACKEND_NAME] = backendId.name;
    contextParams[CDKContextKey.DEPLOYMENT_TYPE] = backendId.type;
    return this.cdkToolkit.fromAssemblyBuilder(
      async () => {
        await tsImport(
          pathToFileURL(this.backendLocator.locate()).toString(),
          import.meta.url,
        );
        /**
          By not having a child process with toolkit lib, the `process.on('beforeExit')` does not execute
          on the CDK side resulting in the app not getting synthesized properly. So we send a signal/message
          to the same process and catch it in backend package where App is initialized to explicitly perform synth
         */
        process.emit('message', 'amplifySynth', undefined);
        return new CloudAssembly(this.absoluteCloudAssemblyLocation);
      },
      { context: contextParams, outdir: this.absoluteCloudAssemblyLocation },
    );
  };

  // Function to compile TypeScript project using Compiler API
  private compileProject = async (projectDirectory: string) => {
    return new Promise<void>((resolve, reject) => {
      // Resolve the path to the tsconfig.json
      const configPath = path.resolve(projectDirectory, 'tsconfig.json');
      if (!fs.existsSync(configPath)) {
        // Not a typescript project, turn off TS compilation
        resolve();
      }
      // Read and parse tsconfig.json
      const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
      if (configFile.error) {
        reject(
          new AmplifyUserError('SyntaxError', {
            message: 'Failed to parse tsconfig.json.',
            resolution:
              'Fix the syntax and type errors in your tsconfig.json file.',
            details: JSON.stringify(configFile.error),
          }),
        );
      }
      // Parse JSON config into a TypeScript compiler options object
      const parsedCommandLine = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        projectDirectory,
      );
      // Modify compiler options to match the command line options
      parsedCommandLine.options.skipLibCheck = true;
      parsedCommandLine.options.noEmit = true;
      // Create a program using the parsed configuration
      const program = ts.createProgram({
        rootNames: parsedCommandLine.fileNames,
        options: parsedCommandLine.options,
      });
      // Perform type checking
      const diagnostics = ts.getPreEmitDiagnostics(program);
      // Report any errors
      if (diagnostics.length > 0) {
        reject(
          new AmplifyUserError('SyntaxError', {
            message: 'TypeScript validation check failed.',
            resolution:
              'Fix the syntax and type errors in your backend definition.',
            details: ts.formatDiagnosticsWithColorAndContext(diagnostics, {
              getCanonicalFileName: (path) => path,
              getCurrentDirectory: ts.sys.getCurrentDirectory,
              getNewLine: () => ts.sys.newLine,
            }),
          }),
        );
      }
      resolve();
    });
  };
}
