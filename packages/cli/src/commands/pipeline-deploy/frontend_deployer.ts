/* eslint-disable no-console */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { execa } from 'execa';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import {
  CloudFormationClient,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';

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

    const frontendSource = fs.readFileSync(frontendPath, 'utf-8');
    const buildCommand = this.extractConfig(frontendSource, 'buildCommand');
    const buildOutputDir = this.extractConfig(frontendSource, 'buildOutputDir');
    const stackName = this.extractConfig(frontendSource, 'stackName');

    if (!buildCommand || !buildOutputDir || !stackName) {
      throw new AmplifyUserError('FrontendConfigError', {
        message:
          'Could not read stackName, buildCommand, or buildOutputDir from frontend.ts',
        resolution:
          'Ensure frontend.ts calls defineFrontend({ stackName: "...", buildCommand: "...", buildOutputDir: "..." })',
      });
    }

    // 1. Run the build command
    console.log(`🔨 Building frontend: ${buildCommand}`);
    const [cmd, ...args] = buildCommand.split(' ');
    await execa(cmd, args, { cwd: projectRoot, stdio: 'inherit' });
    console.log('✅ Frontend built');

    // 2. Copy amplify_outputs.json into build output
    const outputsPath = path.join(projectRoot, 'amplify_outputs.json');
    const buildDir = path.resolve(projectRoot, buildOutputDir);
    if (fs.existsSync(outputsPath) && fs.existsSync(buildDir)) {
      fs.copyFileSync(outputsPath, path.join(buildDir, 'amplify_outputs.json'));
      console.log('📋 Copied amplify_outputs.json into build output');
    }

    // 3. Import frontend.ts — this triggers defineFrontend()
    console.log('📦 Deploying frontend infrastructure...');
    const { tsImport } = await import('tsx/esm/api');
    await tsImport(pathToFileURL(frontendPath).toString(), import.meta.url);

    // 4. Trigger synth
    process.emit('message', 'amplifyFrontendSynth', undefined);

    // 5. Deploy using CDK CLI
    const frontendOutDir = path.resolve(
      projectRoot,
      '.amplify/artifacts/frontend.out',
    );
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

    // 6. Print the URL
    const cfnClient = new CloudFormationClient({});
    const stackResult = await cfnClient.send(
      new DescribeStacksCommand({ StackName: stackName }),
    );
    const outputs = stackResult.Stacks?.[0]?.Outputs ?? [];
    const urlOutput = outputs.find((o) => o.OutputKey === 'FrontendUrl');
    if (urlOutput?.OutputValue) {
      console.log(`\n🎉 Frontend deployed: ${urlOutput.OutputValue}`);
    }
  }

  private extractConfig(source: string, key: string): string | undefined {
    const patterns = [
      new RegExp(`${key}:\\s*'([^']+)'`),
      new RegExp(`${key}:\\s*"([^"]+)"`),
      new RegExp(`${key}:\\s*\`([^\`]+)\``),
    ];
    for (const pattern of patterns) {
      const match = source.match(pattern);
      if (match) return match[1];
    }
    return undefined;
  }
}
