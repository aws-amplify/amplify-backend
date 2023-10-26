import { afterEach, beforeEach, describe, it } from 'node:test';
import path from 'path';
import fs from 'fs/promises';
import { amplifyCli } from '../process-controller/process_controller.js';
import assert from 'node:assert';
import {
  confirmDeleteSandbox,
  ensureDeploymentTimeLessThan,
  interruptSandbox,
  rejectCleanupSandbox,
  updateFileContent,
  waitForSandboxDeploymentToPrintTotalTime,
} from '../process-controller/predicated_action_macros.js';
import { createEmptyAmplifyProject } from '../create_empty_amplify_project.js';
import {
  createTestDirectoryBeforeAndCleanupAfter,
  getTestDir,
} from '../setup_test_directory.js';
import { fileURLToPath, pathToFileURL } from 'url';
import { shortUuid } from '../short_uuid.js';
import {
  CloudFormationClient,
  DeleteStackCommand,
} from '@aws-sdk/client-cloudformation';
import { PredicatedActionBuilder } from '../process-controller/predicated_action_queue_builder.js';

void describe('amplify deploys', () => {
  const e2eProjectDir = getTestDir;
  createTestDirectoryBeforeAndCleanupAfter(e2eProjectDir);

  const cfnClient = new CloudFormationClient();

  let testProjectRoot: string;
  let testAmplifyDir: string;
  beforeEach(async () => {
    ({ testProjectRoot, testAmplifyDir } = await createEmptyAmplifyProject(
      'test-project',
      e2eProjectDir
    ));
  });

  const testProjects = [
    {
      name: 'data-storage-auth-with-triggers',
      amplifyPath: new URL(
        '../../test-projects/data-storage-auth-with-triggers/amplify',
        import.meta.url
      ),
      updates: [
        {
          amplifyPath: new URL(
            '../../test-projects/data-storage-auth-with-triggers/update-1',
            import.meta.url
          ),
          fileToUpdate: 'data/resource.ts',
          deploymentThresholdInSeconds: 22,
        },
      ],
      assertions: async () => {
        const clientConfig = await fs.readFile(
          path.join(testProjectRoot, 'amplifyconfiguration.json'),
          'utf-8'
        );
        assert.deepStrictEqual(Object.keys(JSON.parse(clientConfig)).sort(), [
          'aws_appsync_additionalAuthenticationTypes',
          'aws_appsync_authenticationType',
          'aws_appsync_graphqlEndpoint',
          'aws_appsync_region',
          'aws_cognito_region',
          'aws_user_files_s3_bucket',
          'aws_user_files_s3_bucket_region',
          'aws_user_pools_id',
          'aws_user_pools_web_client_id',
          'modelIntrospection',
        ]);
      },
    },
    {
      name: 'minimalist-project-with-typescript-idioms',
      amplifyPath: new URL(
        '../../test-projects/minimalist-project-with-typescript-idioms/amplify',
        import.meta.url
      ),
      updates: [
        {
          amplifyPath: new URL(
            '../../test-projects/data-storage-auth-with-triggers/update-1',
            import.meta.url
          ),
          fileToUpdate: 'data/resource.ts',
          deploymentThresholdInSeconds: 22,
        },
      ],
      assertions: async () => {
        const clientConfigStats = await fs.stat(
          path.join(testProjectRoot, 'amplifyconfiguration.json')
        );
        assert.ok(clientConfigStats.isFile());
      },
    },
  ];

  void describe('sandbox', () => {
    afterEach(async () => {
      await amplifyCli(['sandbox', 'delete'], testProjectRoot)
        .do(confirmDeleteSandbox())
        .run();
      await fs.rm(testProjectRoot, { recursive: true });
    });

    testProjects.forEach((testProject) => {
      void it(`${testProject.name} deploys with sandbox on startup`, async () => {
        await fs.cp(testProject.amplifyPath, testAmplifyDir, {
          recursive: true,
        });

        await amplifyCli(['sandbox'], testProjectRoot)
          .do(waitForSandboxDeploymentToPrintTotalTime())
          .do(interruptSandbox())
          .do(rejectCleanupSandbox())
          .run();

        await testProject.assertions();
      });
    });

    testProjects.forEach((testProject) => {
      void it(`${testProject.name} hot swaps a change`, async () => {
        await fs.cp(testProject.amplifyPath, testAmplifyDir, {
          recursive: true,
        });

        const processController = amplifyCli(
          ['sandbox', '--dirToWatch', 'amplify'],
          testProjectRoot
        ).do(waitForSandboxDeploymentToPrintTotalTime());

        for (const update of testProject.updates) {
          const fileToUpdate = pathToFileURL(
            path.join(fileURLToPath(update.amplifyPath), update.fileToUpdate)
          );
          const updateSource = pathToFileURL(
            path.join(testAmplifyDir, update.fileToUpdate)
          );

          processController
            .do(updateFileContent(fileToUpdate, updateSource))
            .do(
              ensureDeploymentTimeLessThan(update.deploymentThresholdInSeconds)
            );
        }

        // Execute the process.
        await processController
          .do(interruptSandbox())
          .do(rejectCleanupSandbox())
          .run();

        await testProject.assertions();
      });
    });
  });

  void describe('in pipeline', () => {
    let appId: string;
    let branchName: string;

    beforeEach(() => {
      branchName = 'test-branch';
      appId = `test-${shortUuid()}`;
    });

    afterEach(async () => {
      await cfnClient.send(
        new DeleteStackCommand({
          StackName: `amplify-${appId}-${branchName}`,
        })
      );
      await fs.rm(testProjectRoot, { recursive: true });
    });

    testProjects.forEach((testProject) => {
      void it(testProject.name, async () => {
        await fs.cp(testProject.amplifyPath, testAmplifyDir, {
          recursive: true,
        });

        await amplifyCli(
          ['pipeline-deploy', '--branch', branchName, '--app-id', appId],
          testProjectRoot,
          {
            env: { CI: 'true' },
          }
        ).run();

        await testProject.assertions();
      });
    });
  });

  void describe('it fails on compilation error', () => {
    beforeEach(async () => {
      // any project is fine
      const testProject = testProjects[0];
      await fs.cp(testProject.amplifyPath, testAmplifyDir, {
        recursive: true,
      });

      // inject failure
      await fs.appendFile(
        path.join(testAmplifyDir, 'backend.ts'),
        "this won't compile"
      );
    });

    void it('in sandbox deploy', async () => {
      await amplifyCli(['sandbox', '--dirToWatch', 'amplify'], testProjectRoot)
        .do(new PredicatedActionBuilder().waitForLineIncludes('error TS'))
        .do(
          new PredicatedActionBuilder().waitForLineIncludes(
            'Unexpected keyword or identifier'
          )
        )
        .do(interruptSandbox())
        .do(rejectCleanupSandbox())
        .run();
    });

    void it('in pipeline deploy', async () => {
      await assert.rejects(() =>
        amplifyCli(
          [
            'pipeline-deploy',
            '--branch',
            'test-branch',
            '--app-id',
            `test-${shortUuid()}`,
          ],
          testProjectRoot,
          {
            env: { CI: 'true' },
          }
        )
          .do(new PredicatedActionBuilder().waitForLineIncludes('error TS'))
          .do(
            new PredicatedActionBuilder().waitForLineIncludes(
              'Unexpected keyword or identifier'
            )
          )
          .run()
      );
    });
  });
});
