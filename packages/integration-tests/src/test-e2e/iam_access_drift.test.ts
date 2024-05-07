import { after, before, describe, it } from 'node:test';
import { execa } from 'execa';
import path from 'path';
import { TestBranch, amplifyAppPool } from '../amplify_app_pool.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  AccessAnalyzerClient,
  AccessCheckPolicyType,
  CheckNoNewAccessCommand,
  CheckNoNewAccessCommandOutput,
} from '@aws-sdk/client-accessanalyzer';
import {
  CloudFormationClient,
  DeleteStackCommand,
} from '@aws-sdk/client-cloudformation';
import {
  GetPolicyCommand,
  GetPolicyCommandOutput,
  GetPolicyVersionCommand,
  GetPolicyVersionCommandOutput,
  GetRoleCommand,
  GetRoleCommandOutput,
  GetRolePolicyCommand,
  GetRolePolicyCommandOutput,
  IAMClient,
  ListRolePoliciesCommand,
  ListRolePoliciesCommandOutput,
} from '@aws-sdk/client-iam';
import fsp from 'fs/promises';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import { DeployedResourcesFinder } from '../find_deployed_resource.js';
import { NpmProxyController } from '../npm_proxy_controller.js';
import assert from 'assert';
import os from 'os';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import { amplifyAtTag } from '../constants.js';

void describe('iam access drift', () => {
  let branchBackendIdentifier: BackendIdentifier;
  let testBranch: TestBranch;
  let cfnClient: CloudFormationClient;
  let iamClient: IAMClient;
  let accessAnalyzerClient: AccessAnalyzerClient;
  let tempDir: string;
  let baselineDir: string;
  let deployedResourcesFinder: DeployedResourcesFinder;
  let baselineNpmProxyController: NpmProxyController;
  let currentNpmProxyController: NpmProxyController;

  before(async () => {
    assert.ok(
      process.env.BASELINE_DIR,
      'BASELINE_DIR environment variable must be set and point to amplify-backend repo at baseline version'
    );
    baselineDir = process.env.BASELINE_DIR;

    tempDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), 'test-iam-access-drift')
    );

    iamClient = new IAMClient(e2eToolingClientConfig);
    cfnClient = new CloudFormationClient(e2eToolingClientConfig);
    accessAnalyzerClient = new AccessAnalyzerClient(e2eToolingClientConfig);
    deployedResourcesFinder = new DeployedResourcesFinder(cfnClient);
    baselineNpmProxyController = new NpmProxyController(baselineDir);
    currentNpmProxyController = new NpmProxyController();
    testBranch = await amplifyAppPool.createTestBranch();
    branchBackendIdentifier = {
      namespace: testBranch.appId,
      name: testBranch.branchName,
      type: 'branch',
    };
  });

  after(async () => {
    await cfnClient.send(
      new DeleteStackCommand({
        StackName: BackendIdentifierConversions.toStackName(
          branchBackendIdentifier
        ),
      })
    );
    await fsp.rm(tempDir, { recursive: true });

    await baselineNpmProxyController.tearDown();
    await currentNpmProxyController.tearDown();
  });

  const deploy = async (): Promise<void> => {
    await execa(
      'npx',
      [
        'ampx',
        'pipeline-deploy',
        '--branch',
        branchBackendIdentifier.name,
        '--appId',
        branchBackendIdentifier.namespace,
      ],
      {
        cwd: tempDir,
        stdio: 'inherit',
        env: {
          CI: 'true',
        },
      }
    );
  };

  type ManagedIamPolicy = {
    policyArn: string;
    policyStatement: string;
  };

  type RoleTrustPolicy = {
    roleName: string;
    policyStatement: string;
  };

  type RoleInlinePolicy = {
    roleName: string;
    policyName: string;
    policyStatement: string;
  };

  type PolicyComparisonParams = {
    baselinePolicy?: ManagedIamPolicy | RoleTrustPolicy | RoleInlinePolicy;
    currentPolicy?: ManagedIamPolicy | RoleTrustPolicy | RoleInlinePolicy;
    policyType: AccessCheckPolicyType;
  };

  type PolicyComparisonResult = {
    baselinePolicy:
      | ManagedIamPolicy
      | RoleTrustPolicy
      | RoleInlinePolicy
      | undefined;
    currentPolicy:
      | ManagedIamPolicy
      | RoleTrustPolicy
      | RoleInlinePolicy
      | undefined;
    comparisonResult: Omit<CheckNoNewAccessCommandOutput, '$metadata'>;
  };

  const listManagedIamPolicies = async (): Promise<Array<ManagedIamPolicy>> => {
    const policies: Array<ManagedIamPolicy> = [];
    const policyArns = await deployedResourcesFinder.findByBackendIdentifier(
      branchBackendIdentifier,
      'AWS::IAM::ManagedPolicy'
    );

    for (const policyArn of policyArns) {
      const getPolicyResponse: GetPolicyCommandOutput = await iamClient.send(
        new GetPolicyCommand({
          PolicyArn: policyArn,
        })
      );
      const getPolicyVersionResponse: GetPolicyVersionCommandOutput =
        await iamClient.send(
          new GetPolicyVersionCommand({
            PolicyArn: policyArn,
            VersionId: getPolicyResponse.Policy?.DefaultVersionId,
          })
        );
      if (getPolicyVersionResponse.PolicyVersion?.Document) {
        policies.push({
          policyArn,
          policyStatement: decodeURIComponent(
            getPolicyVersionResponse.PolicyVersion.Document
          ),
        });
      }
    }
    return policies;
  };

  const listRoleTrustPolicies = async (): Promise<Array<RoleTrustPolicy>> => {
    const policies: Array<RoleTrustPolicy> = [];
    const roleNames = await deployedResourcesFinder.findByBackendIdentifier(
      branchBackendIdentifier,
      'AWS::IAM::Role'
    );
    for (const roleName of roleNames) {
      const getRoleResponse: GetRoleCommandOutput = await iamClient.send(
        new GetRoleCommand({
          RoleName: roleName,
        })
      );
      if (getRoleResponse.Role?.AssumeRolePolicyDocument) {
        policies.push({
          roleName,
          policyStatement: decodeURIComponent(
            getRoleResponse.Role.AssumeRolePolicyDocument
          ),
        });
      }
    }
    return policies;
  };

  const listRoleInlinePolicies = async (): Promise<Array<RoleInlinePolicy>> => {
    const policies: Array<RoleInlinePolicy> = [];
    const roleNames = await deployedResourcesFinder.findByBackendIdentifier(
      branchBackendIdentifier,
      'AWS::IAM::Role'
    );
    for (const roleName of roleNames) {
      let nextToken: string | undefined;
      do {
        const listRolePoliciesResponse: ListRolePoliciesCommandOutput =
          await iamClient.send(
            new ListRolePoliciesCommand({
              RoleName: roleName,
              Marker: nextToken,
            })
          );
        nextToken = listRolePoliciesResponse.Marker;
        if (listRolePoliciesResponse.PolicyNames) {
          for (const policyName of listRolePoliciesResponse.PolicyNames) {
            const getRolePolicyResponse: GetRolePolicyCommandOutput =
              await iamClient.send(
                new GetRolePolicyCommand({
                  RoleName: roleName,
                  PolicyName: policyName,
                })
              );
            if (getRolePolicyResponse.PolicyDocument) {
              policies.push({
                roleName,
                policyName,
                policyStatement: decodeURIComponent(
                  getRolePolicyResponse.PolicyDocument
                ),
              });
            }
          }
        }
      } while (nextToken);
    }
    return policies;
  };

  const reinstallDependencies = async (): Promise<void> => {
    await fsp.rm(path.join(tempDir, 'node_modules'), {
      recursive: true,
      force: true,
    });
    await fsp.unlink(path.join(tempDir, 'package-lock.json'));

    await execa('npm', ['install'], {
      cwd: tempDir,
      stdio: 'inherit',
    });
  };

  const comparePolicy = async (
    policyComparisonParams: PolicyComparisonParams
  ): Promise<Omit<CheckNoNewAccessCommandOutput, '$metadata'>> => {
    if (
      !policyComparisonParams.baselinePolicy &&
      !policyComparisonParams.currentPolicy
    ) {
      throw new Error('Neither baseline nor current policy has been provided');
    }
    if (!policyComparisonParams.baselinePolicy) {
      return {
        message:
          'A new policy was added to sample application when using new version of packages',
        result: 'FAIL',
      };
    }
    if (!policyComparisonParams.currentPolicy) {
      return {
        message:
          'A new policy was removed from sample application when using new version of packages',
        result: 'FAIL',
      };
    }
    return await accessAnalyzerClient.send(
      new CheckNoNewAccessCommand({
        existingPolicyDocument:
          policyComparisonParams.baselinePolicy.policyStatement,
        newPolicyDocument: policyComparisonParams.currentPolicy.policyStatement,
        policyType: policyComparisonParams.policyType,
      })
    );
  };

  const matchBaselineAndCurrentPolicies = <
    T extends ManagedIamPolicy | RoleTrustPolicy | RoleInlinePolicy
  >(
    baselinePolicies: Array<T>,
    currentPolicies: Array<T>,
    uniqueKeyProvider: (policy: T) => string,
    policyType: AccessCheckPolicyType
  ): IterableIterator<PolicyComparisonParams> => {
    const policyComparisonParamsMap = new Map<string, PolicyComparisonParams>();
    baselinePolicies.forEach((policy) => {
      const key = uniqueKeyProvider(policy);
      let policyComparisonParams = policyComparisonParamsMap.get(key);
      if (!policyComparisonParams) {
        policyComparisonParams = {
          policyType,
        };
        policyComparisonParamsMap.set(key, policyComparisonParams);
      }
      policyComparisonParams.baselinePolicy = policy;
    });
    currentPolicies.forEach((policy) => {
      const key = uniqueKeyProvider(policy);
      let policyComparisonParams = policyComparisonParamsMap.get(key);
      if (!policyComparisonParams) {
        policyComparisonParams = {
          policyType,
        };
        policyComparisonParamsMap.set(key, policyComparisonParams);
      }
      policyComparisonParams.currentPolicy = policy;
    });
    return policyComparisonParamsMap.values();
  };

  void it('should not drift iam policies', async () => {
    await baselineNpmProxyController.setUp();

    await execa('npm', ['create', amplifyAtTag, '--yes'], {
      cwd: tempDir,
      stdio: 'inherit',
    });

    await deploy();

    const baselineManagedIamPolicies = await listManagedIamPolicies();
    const baselineRoleTrustPolicies = await listRoleTrustPolicies();
    const baselineRoleInlinePolicies = await listRoleInlinePolicies();

    await baselineNpmProxyController.tearDown();
    await currentNpmProxyController.setUp();
    await reinstallDependencies();

    await deploy();

    const currentManagedIamPolicies = await listManagedIamPolicies();
    const currentRoleTrustPolicies = await listRoleTrustPolicies();
    const currentRoleInlinePolicies = await listRoleInlinePolicies();

    const allPolicyComparisonParams: Array<PolicyComparisonParams> = [];
    allPolicyComparisonParams.push(
      ...matchBaselineAndCurrentPolicies(
        baselineManagedIamPolicies,
        currentManagedIamPolicies,
        (policy) => policy.policyArn,
        'IDENTITY_POLICY'
      )
    );

    allPolicyComparisonParams.push(
      ...matchBaselineAndCurrentPolicies(
        baselineRoleTrustPolicies,
        currentRoleTrustPolicies,
        (policy) => policy.roleName,
        'RESOURCE_POLICY'
      )
    );

    allPolicyComparisonParams.push(
      ...matchBaselineAndCurrentPolicies(
        baselineRoleInlinePolicies,
        currentRoleInlinePolicies,
        (policy) => `${policy.roleName}-${policy.policyName}`,
        'IDENTITY_POLICY'
      )
    );

    const comparisonResults: Array<PolicyComparisonResult> = [];
    for (const policyComparisonParams of allPolicyComparisonParams) {
      comparisonResults.push({
        baselinePolicy: policyComparisonParams.baselinePolicy,
        currentPolicy: policyComparisonParams.currentPolicy,
        comparisonResult: await comparePolicy(policyComparisonParams),
      });
    }

    const policiesWithNewAccess = comparisonResults.filter(
      (result) => result.comparisonResult.result === 'FAIL'
    );

    assert.strictEqual(
      policiesWithNewAccess.length,
      0,
      `
    One of policies gained new access. Review the following results:
    ${JSON.stringify(policiesWithNewAccess, null, 2)}
    `
    );
  });
});
