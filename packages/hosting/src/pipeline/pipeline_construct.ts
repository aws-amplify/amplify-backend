import * as cdk from 'aws-cdk-lib';
import { Annotations } from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import {
  CodeBuildStep,
  CodePipeline,
  CodePipelineSource,
  ManualApprovalStep,
  ShellStep,
} from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';
import { DeployStage } from './deploy_stage.js';
import type {
  BranchConfig,
  PipelineProps,
  PipelineStageConfig,
} from './types.js';

const VALID_ARN_PATTERN =
  /^arn:(aws|aws-us-gov|aws-cn):codeconnections:[a-z0-9-]+:\d{12}:connection\/[a-zA-Z0-9-]+$/;

const DEFAULT_SYNTH_COMMANDS = ['npm ci', 'npx cdk synth'];

/**
 * CDK Pipelines-based CI/CD pipeline construct (L3).
 *
 * Creates one self-mutating CodePipeline V2 per branch entry. Each pipeline:
 * - Pulls source from GitHub via CodeConnections (OAuth, no tokens)
 * - Runs synth (install + cdk synth)
 * - Self-mutates if the pipeline definition changes
 * - Deploys to ordered stages with optional manual approval and baking time
 *
 * Multiple branches each get their own independent pipeline, named
 * `${id}-${branch}`. This allows different branches to have different
 * stage configurations and deployment topologies.
 * @template TConfig - Type of the user-defined `config` object passed to each stage.
 * @example Sync stageFactory
 * ```ts
 * new AmplifyPipelineConstruct(stack, 'Pipeline', {
 *   source: {
 *     repo: 'my-org/my-app',
 *     connectionArn: 'arn:aws:codeconnections:us-east-1:123456789:connection/aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb',
 *   },
 *   branches: [
 *     {
 *       branch: 'main',
 *       stages: [
 *         { name: 'beta' },
 *         { name: 'prod', requireApproval: true, config: { domain: 'myapp.com' } },
 *       ],
 *     },
 *   ],
 *   stageFactory: (scope, stageConfig) => {
 *     new MyAppStack(scope, 'App', { env: stageConfig.env });
 *   },
 * });
 * ```
 * @example Async stageFactory
 * ```ts
 * await AmplifyPipelineConstruct.create(stack, 'Pipeline', {
 *   source: { repo: 'my-org/my-app', connectionArn: '...' },
 *   branches: [{ branch: 'main', stages: [{ name: 'prod' }] }],
 *   stageFactory: async (scope, stageConfig) => {
 *     new MyAppStack(scope, 'App', { env: stageConfig.env });
 *   },
 * });
 * ```
 */
export class AmplifyPipelineConstruct<
  TConfig = Record<string, unknown>,
> extends Construct {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static readonly _ASYNC_INIT = Symbol('asyncInit');

  /** The underlying CDK Pipelines CodePipeline instances, keyed by branch name. */
  public readonly codePipelines: ReadonlyMap<string, CodePipeline>;

  /**
   * Create an AmplifyPipelineConstruct with a synchronous stageFactory.
   *
   * For async stageFactory, use the static `AmplifyPipelineConstruct.create()` method instead.
   */
  constructor(
    scope: Construct,
    id: string,
    props: PipelineProps<TConfig>,
    _internal?: { marker: symbol; pipelines: Map<string, CodePipeline> },
  ) {
    super(scope, id);

    if (
      _internal &&
      _internal.marker === AmplifyPipelineConstruct._ASYNC_INIT
    ) {
      this.codePipelines = _internal.pipelines;
      return;
    }

    // Note: async detection is done at call-site (createBranchPipelineSync)
    // by checking the return value, which works even with transpiled code.

    validateProps(this, props);

    const pipelines = new Map<string, CodePipeline>();

    for (const branchConfig of props.branches) {
      const pipeline = createBranchPipelineSync(this, id, branchConfig, props);
      pipelines.set(branchConfig.branch, pipeline);
    }

    this.codePipelines = pipelines;
  }

  /**
   * Async factory for pipelines that use an async stageFactory.
   *
   * Use this when your stageFactory needs to `await` async operations.
   * The method awaits each stage factory call before proceeding, ensuring
   * all CDK constructs are fully initialized before synthesis.
   */
  // eslint-disable-next-line no-restricted-syntax
  static async create<TConfig = Record<string, unknown>>(
    scope: Construct,
    id: string,
    props: PipelineProps<TConfig>,
  ): Promise<AmplifyPipelineConstruct<TConfig>> {
    const instance = new AmplifyPipelineConstruct<TConfig>(scope, id, props, {
      marker: AmplifyPipelineConstruct._ASYNC_INIT,
      pipelines: new Map(),
    });

    validateProps(instance, props);

    const pipelines = new Map<string, CodePipeline>();

    for (const branchConfig of props.branches) {
      const pipeline = await createBranchPipelineAsync(
        instance,
        id,
        branchConfig,
        props,
      );
      pipelines.set(branchConfig.branch, pipeline);
    }

    (
      instance as { codePipelines: ReadonlyMap<string, CodePipeline> }
    ).codePipelines = pipelines;

    return instance;
  }
}

// ─── Shared helpers ──────────────────────────────────────────────

const validateProps = <TConfig>(
  construct: Construct,
  props: PipelineProps<TConfig>,
): void => {
  if (props.branches.length === 0) {
    throw new Error('Pipeline: `branches` must not be empty.');
  }

  if (!props.source.repo.includes('/')) {
    throw new Error(
      `Pipeline: \`repo\` must be in "owner/repo" format (got "${props.source.repo}").`,
    );
  }

  if (!VALID_ARN_PATTERN.test(props.source.connectionArn)) {
    throw new Error(
      'Pipeline: `connectionArn` must be a valid CodeConnections ARN ' +
        'in the format "arn:aws:codeconnections:<region>:<account-id>:connection/<connection-id>". ' +
        'Accepted partitions: aws, aws-us-gov, aws-cn. ' +
        'Create a CodeConnections connection in the AWS Console under Developer Tools > Connections, ' +
        'then complete the OAuth handshake before using it.',
    );
  }

  if (
    props.source.triggerOnPush === true &&
    props.source.triggerFilters?.length
  ) {
    throw new Error(
      'Pipeline: source.triggerOnPush cannot be true when source.triggerFilters are set. ' +
        'CodePipeline uses filters instead of push triggers when filters are configured.',
    );
  }

  const branchNames = new Set<string>();
  for (const branchConfig of props.branches) {
    if (branchNames.has(branchConfig.branch)) {
      throw new Error(
        `Pipeline: duplicate branch name "${branchConfig.branch}". Each branch must be unique.`,
      );
    }
    branchNames.add(branchConfig.branch);

    if (branchConfig.stages.length === 0) {
      throw new Error(
        `Pipeline: branch "${branchConfig.branch}" has an empty \`stages\` array. At least one stage is required.`,
      );
    }

    const stageNames = new Set<string>();
    for (const stage of branchConfig.stages) {
      if (stageNames.has(stage.name)) {
        throw new Error(
          `Pipeline: duplicate stage name "${stage.name}" in branch "${branchConfig.branch}". Stage names must be unique within a branch.`,
        );
      }
      stageNames.add(stage.name);

      if (!/^[a-zA-Z0-9_-]+$/.test(stage.name)) {
        throw new Error(
          `Pipeline: stage name "${stage.name}" contains invalid characters. ` +
            `Stage names must be alphanumeric with hyphens/underscores (a-zA-Z0-9_-).`,
        );
      }
    }
  }

  const sanitizedBranches = props.branches.map((b) =>
    b.branch.replace(/[^a-zA-Z0-9-]/g, '-'),
  );
  const seen = new Set<string>();
  for (let i = 0; i < sanitizedBranches.length; i++) {
    if (seen.has(sanitizedBranches[i])) {
      throw new Error(
        `Pipeline: branch '${props.branches[i].branch}' produces a collision after sanitization. ` +
          `Use more distinct branch names.`,
      );
    }
    seen.add(sanitizedBranches[i]);
  }

  const pipelineAccount = cdk.Stack.of(construct).account;
  const hasCrossAccount =
    !cdk.Token.isUnresolved(pipelineAccount) &&
    props.branches.some((b) =>
      b.stages.some(
        (s) =>
          s.env?.account &&
          !cdk.Token.isUnresolved(s.env.account) &&
          s.env.account !== pipelineAccount,
      ),
    );
  if (hasCrossAccount && !props.crossAccountKeys) {
    throw new Error(
      'Pipeline: crossAccountKeys must be true when deploying to different accounts. ' +
        'This creates a KMS key (~$1/month) for cross-account artifact encryption.',
    );
  }

  if (props.synth?.computeType === codebuild.ComputeType.SMALL) {
    Annotations.of(construct).addWarning(
      'ComputeType.SMALL (3GB RAM) may be insufficient for apps with Lambda bundling or frontend builds. ' +
        'If synth fails with exit code 137 (OOM), remove the computeType override to use the default MEDIUM (7GB).',
    );
  }
};

const buildCodePipeline = <TConfig>(
  construct: Construct,
  branchId: string,
  branchConfig: BranchConfig<TConfig>,
  props: PipelineProps<TConfig>,
): { codePipeline: CodePipeline; source: CodePipelineSource } => {
  const hasTriggerFilters =
    props.source.triggerFilters && props.source.triggerFilters.length > 0;
  if (branchConfig.triggerOnPush === true && hasTriggerFilters) {
    throw new Error(
      `Pipeline branch '${branchConfig.branch}': triggerOnPush cannot be true when triggerFilters are set. ` +
        'CodePipeline uses filters instead of push triggers when filters are configured.',
    );
  }
  // When triggerFilters are set, CodePipeline uses the filter-based trigger
  // configuration (added via pipeline.addTrigger) instead of push triggers
  const triggerOnPush = hasTriggerFilters
    ? false
    : (branchConfig.triggerOnPush ?? props.source.triggerOnPush ?? true);

  const source =
    props._sourceOverride ??
    CodePipelineSource.connection(props.source.repo, branchConfig.branch, {
      connectionArn: props.source.connectionArn,
      triggerOnPush,
    });

  const synthCommands = props.synth?.commands ?? DEFAULT_SYNTH_COMMANDS;
  const synthStep = new ShellStep('Synth', {
    input: source,
    installCommands: props.synth?.installCommands,
    commands: synthCommands,
    env: props.synth?.env,
    primaryOutputDirectory: props.synth?.primaryOutputDirectory,
  });

  const codePipeline = new CodePipeline(construct, branchId, {
    synth: synthStep,
    selfMutation: props.selfMutation ?? true,
    crossAccountKeys: props.crossAccountKeys ?? false,
    pipelineType: codepipeline.PipelineType.V2,
    dockerEnabledForSynth: props.synth?.dockerEnabled ?? false,
    synthCodeBuildDefaults: {
      buildEnvironment: {
        buildImage:
          props.synth?.buildImage ??
          codebuild.LinuxBuildImage.AMAZON_LINUX_2023_5,
        computeType: props.synth?.computeType ?? codebuild.ComputeType.MEDIUM,
      },
    },
  });

  return { codePipeline, source };
};

const addStageToCodePipeline = <TConfig>(
  codePipeline: CodePipeline,
  stageConfig: PipelineStageConfig<TConfig>,
  deployStage: DeployStage<TConfig>,
  additionalPostSteps?: Array<ShellStep | CodeBuildStep>,
): void => {
  const pre: Array<ManualApprovalStep | ShellStep> = [];
  const post: Array<ShellStep | CodeBuildStep> = [];

  if (stageConfig.requireApproval) {
    pre.push(
      new ManualApprovalStep(`Approve-${stageConfig.name}`, {
        comment:
          stageConfig.approvalComment ??
          `Approve deployment to ${stageConfig.name}`,
      }),
    );
  }

  if (stageConfig.bakeTime) {
    const seconds = stageConfig.bakeTime.toSeconds();
    const timeoutMinutes = stageConfig.bakeTime.toMinutes() + 30;
    post.push(
      new CodeBuildStep(`BakingTime-${stageConfig.name}`, {
        commands: [`echo "Baking for ${seconds}s..." && sleep ${seconds}`],
        timeout: cdk.Duration.minutes(timeoutMinutes),
      }),
    );
  }

  if (additionalPostSteps) {
    post.push(...additionalPostSteps);
  }

  codePipeline.addStage(deployStage, { pre, post });
};

const validateBakingTime = <TConfig>(
  stageConfig: PipelineStageConfig<TConfig>,
): void => {
  if (stageConfig.bakeTime && stageConfig.bakeTime.toMinutes() > 55) {
    throw new Error(
      `Pipeline: bakeTime for stage '${stageConfig.name}' exceeds 55 minutes (CodeBuild timeout limit). ` +
        'Use requireApproval with external monitoring for longer baking periods.',
    );
  }
};

const validateStageStacks = (stage: cdk.Stage, stageName: string): void => {
  const stacks = stage.node.children.filter(
    (c): c is cdk.Stack => c instanceof cdk.Stack,
  );

  if (stacks.length === 0) {
    throw new Error(
      `Pipeline: stage '${stageName}' must contain at least one Stack. ` +
        'Ensure your hosting.ts or backend.ts creates resources for this stage.',
    );
  }
};

// ─── Sync path ───────────────────────────────────────────────────

const createBranchPipelineSync = <TConfig>(
  construct: Construct,
  id: string,
  branchConfig: BranchConfig<TConfig>,
  props: PipelineProps<TConfig>,
): CodePipeline => {
  const safeBranch = branchConfig.branch.replace(/[^a-zA-Z0-9-]/g, '-');
  const branchId = `${id}-${safeBranch}`;

  const { codePipeline, source } = buildCodePipeline(
    construct,
    branchId,
    branchConfig,
    props,
  );

  for (const stageConfig of branchConfig.stages) {
    validateBakingTime(stageConfig);

    const stage = new DeployStage(
      construct,
      `${branchId}-Stage-${stageConfig.name}`,
      {
        stageConfig,
      },
    );

    let result: void | Promise<void>;
    if (stageConfig.environment) {
      const originalEnv: Record<string, string | undefined> = {};
      for (const [key, value] of Object.entries(stageConfig.environment)) {
        originalEnv[key] = process.env[key];
        process.env[key] = value;
      }
      try {
        result = props.stageFactory(stage, stageConfig);
      } finally {
        for (const [key, originalValue] of Object.entries(originalEnv)) {
          if (originalValue === undefined) {
            delete process.env[key];
          } else {
            process.env[key] = originalValue;
          }
        }
      }
    } else {
      result = props.stageFactory(stage, stageConfig);
    }

    if (result && typeof (result as Promise<void>).then === 'function') {
      throw new Error(
        'AmplifyPipelineConstruct: async stage factory detected in sync constructor. ' +
          'Use AmplifyPipelineConstruct.create() for async stage factories.',
      );
    }

    validateStageStacks(stage, stageConfig.name);

    const additionalPostSteps = props._postStageHook
      ? props._postStageHook({ source, stage, stageConfig })
      : undefined;
    addStageToCodePipeline(
      codePipeline,
      stageConfig,
      stage,
      additionalPostSteps,
    );
  }

  addTriggerFilters(codePipeline, branchConfig, props);

  return codePipeline;
};

// ─── Async path ──────────────────────────────────────────────────

const createBranchPipelineAsync = async <TConfig>(
  construct: Construct,
  id: string,
  branchConfig: BranchConfig<TConfig>,
  props: PipelineProps<TConfig>,
): Promise<CodePipeline> => {
  const safeBranch = branchConfig.branch.replace(/[^a-zA-Z0-9-]/g, '-');
  const branchId = `${id}-${safeBranch}`;

  const { codePipeline, source } = buildCodePipeline(
    construct,
    branchId,
    branchConfig,
    props,
  );

  for (const stageConfig of branchConfig.stages) {
    validateBakingTime(stageConfig);

    const stage = new DeployStage(
      construct,
      `${branchId}-Stage-${stageConfig.name}`,
      {
        stageConfig,
      },
    );

    if (stageConfig.environment) {
      const originalEnv: Record<string, string | undefined> = {};
      for (const [key, value] of Object.entries(stageConfig.environment)) {
        originalEnv[key] = process.env[key];
        process.env[key] = value;
      }
      try {
        await props.stageFactory(stage, stageConfig);
      } finally {
        for (const [key, originalValue] of Object.entries(originalEnv)) {
          if (originalValue === undefined) {
            delete process.env[key];
          } else {
            process.env[key] = originalValue;
          }
        }
      }
    } else {
      await props.stageFactory(stage, stageConfig);
    }

    validateStageStacks(stage, stageConfig.name);

    const additionalPostSteps = props._postStageHook
      ? props._postStageHook({ source, stage, stageConfig })
      : undefined;
    addStageToCodePipeline(
      codePipeline,
      stageConfig,
      stage,
      additionalPostSteps,
    );
  }

  addTriggerFilters(codePipeline, branchConfig, props);

  return codePipeline;
};

const addTriggerFilters = <TConfig>(
  codePipeline: CodePipeline,
  branchConfig: BranchConfig<TConfig>,
  props: PipelineProps<TConfig>,
): void => {
  const triggerFilters = props.source.triggerFilters;
  if (!triggerFilters || triggerFilters.length === 0) {
    return;
  }

  codePipeline.buildPipeline();

  const sourceAction = codePipeline.pipeline.stages[0].actions[0];
  codePipeline.pipeline.addTrigger({
    providerType: codepipeline.ProviderType.CODE_STAR_SOURCE_CONNECTION,
    gitConfiguration: {
      sourceAction,
      pushFilter: [
        {
          branchesIncludes: [branchConfig.branch],
          filePathsIncludes: triggerFilters,
        },
      ],
    },
  });
};
