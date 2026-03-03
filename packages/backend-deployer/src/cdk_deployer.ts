import process from 'node:process';
import fs from 'node:fs';

import {
  BackendDeployer,
  DeployProps,
} from './cdk_deployer_singleton_factory.js';
import { CdkErrorMapper } from './cdk_error_mapper.js';
import {
  AmplifyIOHost,
  BackendIdentifier,
  DeploymentType,
  type PackageManagerController,
} from '@aws-amplify/plugin-types';
import {
  AmplifyError,
  AmplifyFault,
  AmplifyUserError,
  BackendLocator,
  CDKContextKey,
} from '@aws-amplify/platform-core';
import path from 'path';
import {
  MemoryContext,
  StackSelectionStrategy,
  Toolkit,
} from '@aws-cdk/toolkit-lib';
import { tsImport } from 'tsx/esm/api';
import { CloudAssembly } from 'aws-cdk-lib/cx-api';
import { pathToFileURL } from 'url';
import { AssetStaging } from 'aws-cdk-lib/core';
import { Worker } from 'node:worker_threads';

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

    // Read deployment type from synthesized template (after synth, before deploy)
    const { deploymentType: detectedType, stackName: actualStackName } =
      this.readDeploymentMetadataFromTemplate();

    // Validate CLI args against detected type (pipeline-deploy only)
    if (detectedType !== undefined && deployProps?.validateAppSources) {
      this.validateDeploymentArgs(detectedType, deployProps);
    }

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
        await this.compileProject(path.dirname(this.backendLocator.locate()));
      } catch (typeError) {
        if (
          synthError &&
          AmplifyError.isAmplifyError(typeError) &&
          typeError.name === 'FunctionEnvVarFileNotGeneratedError'
        ) {
          // synth has failed and we don't have auto generated function environment definition files. This
          // resulted in the exception caught here, which is not very useful for the customers.
          // We instead throw the synth error for customers to fix what caused the synth to fail.
          throw this.cdkErrorMapper.getAmplifyError(synthError, backendId.type);
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
      throw this.cdkErrorMapper.getAmplifyError(synthError, backendId.type);
    }

    // Perform actual deployment. CFN or hotswap
    const deployStartTime = Date.now();
    try {
      await this.cdkToolkit.deploy(synthAssembly!, {
        stacks: {
          strategy: StackSelectionStrategy.ALL_STACKS,
        },
        deploymentMethod:
          backendId.type === 'sandbox'
            ? { method: 'hotswap', fallback: { method: 'direct' } }
            : { method: 'direct' },
      });
    } catch (error) {
      await this.ioHost.notify({
        message: 'Deployment failed',
        code: 'DEPLOY_FAILED',
        action: 'amplify',
        time: new Date(),
        level: 'error',
        data: undefined,
      });
      throw this.cdkErrorMapper.getAmplifyError(error as Error, backendId.type);
    } finally {
      await synthAssembly?.dispose();
    }

    return {
      deploymentTimes: {
        synthesisTime: synthTimeSeconds,
        totalTime:
          synthTimeSeconds +
          Math.floor((Date.now() - deployStartTime) / 10) / 100,
      },
      backendId: this.resolveBackendId(
        detectedType,
        deployProps,
        backendId,
        actualStackName,
      ),
      stackName: actualStackName,
    };
  };

  /**
   * Invokes cdk destroy API
   */
  destroy = async (backendId: BackendIdentifier) => {
    const deploymentStartTime = Date.now();
    try {
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
    } catch (error) {
      throw this.cdkErrorMapper.getAmplifyError(error as Error, backendId.type);
    }
  };

  compileProject = (projectDirectory: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('ts_compiler.js', import.meta.url), {
        workerData: { projectDirectory },
      });
      worker.on('message', () => {
        // do nothing
      });
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(
            new AmplifyFault('TSCompilerWorkerFault', {
              message: `Worker stopped with exit code ${code}`,
            }),
          );
        }
        resolve();
      });
    });
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
      {
        contextStore: new MemoryContext(contextParams),
        outdir: this.absoluteCloudAssemblyLocation,
      },
    );
  };
  /**
   * Reads deployment metadata from the synthesized CloudFormation template.
   * After synth, the template is on disk in the cloud assembly output directory.
   * Returns the deployment type and the actual CFN stack name from the manifest.
   */
  private readDeploymentMetadataFromTemplate(): {
    deploymentType: DeploymentType | undefined;
    stackName: string | undefined;
  } {
    try {
      const cdkOutDir = this.absoluteCloudAssemblyLocation;
      const manifestPath = path.join(cdkOutDir, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      for (const [artifactId, artifact] of Object.entries(manifest.artifacts)) {
        if (
          (artifact as Record<string, unknown>).type ===
          'aws:cloudformation:stack'
        ) {
          const templateFile = path.join(
            cdkOutDir,
            (
              artifact as {
                properties: { templateFile: string };
              }
            ).properties.templateFile,
          );
          const template = JSON.parse(fs.readFileSync(templateFile, 'utf-8'));
          const deploymentTypeOutput = template.Outputs?.deploymentType;
          if (deploymentTypeOutput) {
            return {
              deploymentType: deploymentTypeOutput.Value as DeploymentType,
              stackName: artifactId,
            };
          }
        }
      }
      return { deploymentType: undefined, stackName: undefined };
    } catch {
      return { deploymentType: undefined, stackName: undefined };
    }
  }

  /**
   * Validates CLI args against the detected deployment type.
   * Standalone deployments require ZERO flags; branch deployments require both --branch and --app-id.
   * Called after synth but before CFN deploy.
   */
  private validateDeploymentArgs(
    detectedType: DeploymentType,
    deployProps?: DeployProps,
  ): void {
    const { branch, appId } = deployProps ?? {};

    if (detectedType === 'standalone') {
      if (branch && appId) {
        throw new AmplifyUserError('ConflictingDeploymentConfigError', {
          message:
            'Your backend.ts provides a custom CDK App to defineBackend(), but --branch and --app-id were also specified.',
          resolution:
            'Remove all flags when using a custom App. Standalone deployments require zero CLI flags.',
        });
      }
      if (appId) {
        throw new AmplifyUserError('ConflictingDeploymentConfigError', {
          message:
            'Your backend.ts provides a custom CDK App to defineBackend(), but --app-id was also specified.',
          resolution:
            'Remove --app-id when using a custom App. Standalone deployments do not use Amplify Hosting.',
        });
      }
      if (branch) {
        throw new AmplifyUserError('ConflictingDeploymentConfigError', {
          message:
            'Your backend.ts provides a custom CDK App to defineBackend(), but --branch was also specified.',
          resolution:
            'Remove --branch when using a custom App. Standalone deployments do not use branch-based naming.',
        });
      }
    } else {
      if (!appId) {
        throw new AmplifyUserError('InvalidCommandInputError', {
          message:
            '--app-id is required when backend.ts does not provide a custom CDK App to defineBackend().',
          resolution:
            'Provide --app-id for Amplify Hosting deployments, or pass a custom CDK App to defineBackend() for standalone deployments.',
        });
      }
      if (!branch) {
        throw new AmplifyUserError('InvalidCommandInputError', {
          message:
            '--branch is required when backend.ts does not provide a custom CDK App to defineBackend().',
          resolution: 'Provide --branch for Amplify Hosting deployments.',
        });
      }
    }
  }

  /**
   * Resolves the BackendIdentifier from the detected deployment type and deploy props.
   * - Standalone: returns a fixed identifier with namespace 'amplify' and name 'default'
   * - Branch with both args: returns identifier from deploy props
   * - Otherwise: falls back to the original backendId parameter
   */
  private resolveBackendId(
    detectedType: DeploymentType | undefined,
    deployProps: DeployProps | undefined,
    fallback: BackendIdentifier,
    stackName: string | undefined,
  ): BackendIdentifier {
    if (detectedType === 'standalone') {
      return {
        type: 'standalone',
        namespace: stackName ?? 'amplify',
        name: 'default',
      };
    }
    if (
      detectedType === 'branch' &&
      deployProps?.branch &&
      deployProps?.appId
    ) {
      return {
        type: 'branch',
        namespace: deployProps.appId,
        name: deployProps.branch,
      };
    }
    return fallback;
  }
}
