import type { CfnResource } from 'aws-cdk-lib';

type ResourceDependencyCapable = {
  addResourceDependency?: (target: CfnResource) => void;
};

/**
 * Declares that `source` depends on `target`, emitting a CloudFormation `DependsOn` entry.
 *
 * aws-cdk-lib deprecated `CfnResource#addDependency` in favor of `addResourceDependency` and
 * will remove the old name in CDK v3. Older supported versions of aws-cdk-lib do not expose
 * `addResourceDependency` at all, so the capability is feature-detected at runtime.
 * @param source the resource that depends on `target`
 * @param target the resource that must be created first
 */
export const addCfnResourceDependency = (
  source: CfnResource,
  target: CfnResource,
): void => {
  const candidate = source as unknown as ResourceDependencyCapable;
  if (typeof candidate.addResourceDependency === 'function') {
    candidate.addResourceDependency(target);
  } else {
    source.addDependency(target);
  }
};
