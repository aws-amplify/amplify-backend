/* eslint-disable no-console */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { execa } from 'execa';
import { AmplifyUserError } from '@aws-amplify/platform-core';

/**
 * Deploys frontend infrastructure defined in amplify/frontend.ts.
 */
export class FrontendDeployer {
  /**
   * Deploys the frontend stack and uploads build artifacts.
   */
  async deployFrontend(projectRoot: string): Promise<void> {
    const frontendPath = path.join(projectRoot, 'amplify', 'frontend.ts');

    if (!fs.existsSync(frontendPath)) {
      return;
    }

    // 1. Import frontend.ts first to trigger defineFrontend() and get config
    //    We need to synth first to know the stack name (it may use env vars)
    console.log('📦 Preparing frontend...');
    const { tsImport } = await import('tsx/esm/api');
    await tsImport(pathToFileURL(frontendPath).toString(), import.meta.url);

    // 2. Read buildCommand and buildOutputDir from the source (simple strings only)
    const frontendSource = fs.readFileSync(frontendPath, 'utf-8');
    const buildCommand = this.extractConfig(frontendSource, 'buildCommand');
    const buildOutputDir = this.extractConfig(frontendSource, 'buildOutputDir');

    if (!buildCommand || !buildOutputDir) {
      throw new AmplifyUserError('FrontendConfigError', {
        message:
          'Could not read buildCommand or buildOutputDir from frontend.ts',
        resolution:
          'Ensure buildCommand and buildOutputDir use simple string literals (not template literals)',
      });
    }

    // 3. Run the build command
    console.log(`🔨 Building frontend: ${buildCommand}`);
    const [cmd, ...args] = buildCommand.split(' ');
    await execa(cmd, args, { cwd: projectRoot, stdio: 'inherit' });
    console.log('✅ Frontend built');

    // 4. Copy amplify_outputs.json into build output
    const outputsPath = path.join(projectRoot, 'amplify_outputs.json');
    const buildDir = path.resolve(projectRoot, buildOutputDir);
    if (fs.existsSync(outputsPath) && fs.existsSync(buildDir)) {
      fs.copyFileSync(outputsPath, path.join(buildDir, 'amplify_outputs.json'));
      console.log('📋 Copied amplify_outputs.json into build output');
    }

    // 5. Trigger synth (now that build output exists for BucketDeployment)
    process.emit('message', 'amplifyFrontendSynth', undefined);

    // 6. Read the stack name from the synthesized manifest
    const frontendOutDir = path.resolve(
      projectRoot,
      '.amplify/artifacts/frontend.out',
    );
    const manifestPath = path.join(frontendOutDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const stackName = Object.keys(manifest.artifacts).find(
      (key) =>
        (manifest.artifacts[key] as { type: string }).type ===
        'aws:cloudformation:stack',
    );

    if (!stackName) {
      throw new AmplifyUserError('FrontendStackNotFoundError', {
        message: 'No CloudFormation stack found in frontend synth output',
        resolution: 'Ensure frontend.ts calls defineFrontend()',
      });
    }

    // 7. Deploy using CDK CLI
    console.log(`📦 Deploying frontend stack: ${stackName}`);
    await execa(
      'npx',
      [
        'cdk',
        'deploy',
        '--app',
        frontendOutDir,
        '--require-approval',
        'never',
        '--outputs-file',
        path.join(projectRoot, 'frontend-outputs.json'),
      ],
      {
        cwd: projectRoot,
        stdio: 'inherit',
      },
    );

    // 8. Print the URL from outputs file
    const outputsFile = path.join(projectRoot, 'frontend-outputs.json');
    if (fs.existsSync(outputsFile)) {
      const outputs = JSON.parse(fs.readFileSync(outputsFile, 'utf-8'));
      const stackOutputs = outputs[stackName];
      if (stackOutputs?.FrontendUrl) {
        console.log(`\n🎉 Frontend deployed: ${stackOutputs.FrontendUrl}`);
      }
    }
  }

  private extractConfig(source: string, key: string): string | undefined {
    const patterns = [
      new RegExp(`${key}:\\s*'([^']+)'`),
      new RegExp(`${key}:\\s*"([^"]+)"`),
    ];
    for (const pattern of patterns) {
      const match = source.match(pattern);
      if (match) return match[1];
    }
    return undefined;
  }
}
