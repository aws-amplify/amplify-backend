import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { execa } from 'execa';
import { AmplifyUserError } from '@aws-amplify/platform-core';

/**
 * Deploys the CI/CD pipeline defined in amplify/pipeline.ts.
 */
export class PipelineStackDeployer {
  /**
   * Deploys the pipeline stack.
   */
  async deployPipeline(projectRoot: string): Promise<void> {
    const pipelinePath = path.join(projectRoot, 'amplify', 'pipeline.ts');

    if (!fs.existsSync(pipelinePath)) {
      throw new AmplifyUserError('PipelineFileNotFoundError', {
        message: 'amplify/pipeline.ts not found',
        resolution:
          'Create amplify/pipeline.ts with a definePipeline() call to use --pipeline',
      });
    }

    // eslint-disable-next-line no-console
    console.log('📦 Deploying CI/CD pipeline...');

    // Import pipeline.ts — triggers definePipeline()
    const { tsImport } = await import('tsx/esm/api');
    await tsImport(pathToFileURL(pipelinePath).toString(), import.meta.url);

    // Trigger synth
    process.emit('message', 'amplifyPipelineSynth', undefined);

    // Deploy using CDK CLI
    const pipelineOutDir = path.resolve(
      projectRoot,
      '.amplify/artifacts/pipeline.out',
    );
    await execa(
      'npx',
      [
        'cdk',
        'deploy',
        '--app',
        pipelineOutDir,
        '--require-approval',
        'never',
        '--all',
      ],
      {
        cwd: projectRoot,
        stdio: 'inherit',
      },
    );

    // eslint-disable-next-line no-console
    console.log(
      '\n🎉 Pipeline deployed. It will trigger on pushes to the configured branch.',
    );
  }
}
