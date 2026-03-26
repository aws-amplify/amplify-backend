import * as path from 'path';
import {
  AmplifyResourceGroupName,
  ConstructContainerEntryGenerator,
  ConstructFactoryGetInstanceProps,
  GenerateContainerEntryProps,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { Tags } from 'aws-cdk-lib';
import { TagName } from '@aws-amplify/platform-core';
import { HostingProps, HostingResources } from './types.js';
import {
  AmplifyHostingConstruct,
  AmplifyHostingConstructProps,
} from './constructs/hosting-construct.js';
import { detectFramework, getAdapter } from './adapters/index.js';
import { getHostingOutputDir, parseManifest } from './manifest/parser.js';

/**
 * Generates hosting construct entries for the construct container.
 */
export class AmplifyHostingGenerator
  implements ConstructContainerEntryGenerator
{
  readonly resourceGroupName: AmplifyResourceGroupName = 'hosting';
  private readonly name: string;

  constructor(
    private readonly props: HostingProps,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps,
  ) {
    this.name = props.name ?? 'amplifyHosting';
  }

  generateContainerEntry = ({
    scope,
  }: GenerateContainerEntryProps): ResourceProvider<HostingResources> => {
    // Determine the project directory (one level above amplify/)
    const projectDir = process.cwd();

    // Auto-detect or use explicit framework
    const framework =
      this.props.framework ?? detectFramework(projectDir);

    // Default build output dirs per framework
    const buildOutputDir = this.props.buildOutputDir ??
      getDefaultBuildOutputDir(framework);

    const absoluteBuildOutputDir = path.isAbsolute(buildOutputDir)
      ? buildOutputDir
      : path.join(projectDir, buildOutputDir);

    // Get the adapter and run it to produce .amplify-hosting/
    const adapter = getAdapter(framework);
    const manifest = adapter(absoluteBuildOutputDir, projectDir);

    // Resolve paths
    const hostingOutputDir = getHostingOutputDir(projectDir);
    const staticAssetPath = path.join(hostingOutputDir, 'static');
    const computeBasePath = path.join(hostingOutputDir, 'compute');

    const constructProps: AmplifyHostingConstructProps = {
      manifest,
      staticAssetPath,
      computeBasePath,
      domain: this.props.domain,
      waf: this.props.waf,
      name: this.name,
    };

    const hostingConstruct = new AmplifyHostingConstruct(
      scope,
      this.name,
      constructProps,
    );

    Tags.of(hostingConstruct).add(TagName.FRIENDLY_NAME, this.name);

    // Store outputs for client config generation
    this.getInstanceProps.outputStorageStrategy.addBackendOutputEntry(
      'AWS::Amplify::Hosting',
      {
        version: '1',
        payload: {
          distributionUrl: hostingConstruct.distributionUrl,
        },
      },
    );

    return {
      resources: hostingConstruct.getResources(),
    };
  };
}

/**
 * Get the default build output directory for a given framework.
 */
const getDefaultBuildOutputDir = (framework: string): string => {
  switch (framework) {
    case 'nextjs':
      return '.next';
    case 'spa':
      return 'dist';
    case 'static':
      return 'public';
    default:
      return 'dist';
  }
};
