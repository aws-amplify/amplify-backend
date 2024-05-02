import { after, before, describe, it } from 'node:test';
import { execa } from 'execa';
import path from 'path';
import { TestBranch, amplifyAppPool } from '../amplify_app_pool.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  AccessAnalyzerClient,
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
import { AccessCheckPolicyType } from '@aws-sdk/client-accessanalyzer/dist-types/models/models_0.js';
import assert from 'assert';
import os from 'os';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';

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
    // assert.ok(
    //   process.env.BASELINE_DIR,
    //   'BASELINE_DIR environment variable must be set and point to amplify-backend repo at baseline version'
    // );
    baselineDir = process.cwd();

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

  type PolicyComparisonResult = {
    baselinePolicy: ManagedIamPolicy | RoleTrustPolicy | RoleInlinePolicy;
    currentPolicy: ManagedIamPolicy | RoleTrustPolicy | RoleInlinePolicy;
    comparisonResult: CheckNoNewAccessCommandOutput;
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
    baselinePolicy: string,
    currentPolicy: string,
    policyType: AccessCheckPolicyType
  ): Promise<CheckNoNewAccessCommandOutput> => {
    return await accessAnalyzerClient.send(
      new CheckNoNewAccessCommand({
        existingPolicyDocument: baselinePolicy,
        newPolicyDocument: currentPolicy,
        policyType: policyType,
      })
    );
  };

  void it('should not drift iam policies', async () => {
    await baselineNpmProxyController.setUp();

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

    const comparisonResults: Array<PolicyComparisonResult> = [];
    for (const baselinePolicy of baselineManagedIamPolicies) {
      const currentPolicy = currentManagedIamPolicies.find(
        (p) => p.policyArn === baselinePolicy.policyArn
      );
      if (currentPolicy) {
        comparisonResults.push({
          baselinePolicy,
          currentPolicy,
          comparisonResult: await comparePolicy(
            baselinePolicy.policyStatement,
            currentPolicy.policyStatement,
            'IDENTITY_POLICY'
          ),
        });
      }
    }

    for (const baselinePolicy of baselineRoleTrustPolicies) {
      const currentPolicy = currentRoleTrustPolicies.find(
        (p) => p.roleName === baselinePolicy.roleName
      );
      if (currentPolicy) {
        comparisonResults.push({
          baselinePolicy,
          currentPolicy,
          comparisonResult: await comparePolicy(
            baselinePolicy.policyStatement,
            currentPolicy.policyStatement,
            'RESOURCE_POLICY'
          ),
        });
      }
    }

    for (const baselinePolicy of baselineRoleInlinePolicies) {
      const currentPolicy = currentRoleInlinePolicies.find(
        (p) =>
          p.roleName === baselinePolicy.roleName &&
          p.policyName === baselinePolicy.policyName
      );
      if (currentPolicy) {
        comparisonResults.push({
          baselinePolicy,
          currentPolicy,
          comparisonResult: await comparePolicy(
            baselinePolicy.policyStatement,
            currentPolicy.policyStatement,
            'IDENTITY_POLICY'
          ),
        });
      }
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
