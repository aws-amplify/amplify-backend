// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createTestDirectory,
  deleteTestDirectory,
  rootTestDir,
} from '../../setup_test_directory.js';
import { TestBranch, amplifyAppPool } from '../../amplify_app_pool.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  AttachedDomainIdentityResolution,
  NotificationsAttachProjectTestProject,
  NotificationsAttachProjectTestProjectCreator,
} from '../../test-project-setup/notifications_attach_project.js';
import {
  cleanupAllCreatedProfilesDomains,
  sweepStaleProfilesDomains,
} from '../../resource-creation/customer_profiles_domain_creator.js';

/**
 * Deploy-time compatibility of `defineNotifications` ATTACH mode with the
 * Identity Resolution (profile merging) setting of the Customer Profiles domain
 * it attaches to.
 *
 * The package binds each Customer Profile to the server-derived caller
 * `principalId`, so the mapping between a principal and its profile has to stay
 * one-to-one. Profile merging combines profiles across principals, which does
 * not preserve that mapping — so an attached domain must have Identity
 * Resolution disabled, and a deployment that attaches to a domain which has it
 * enabled is stopped by a custom resource reading `GetDomain`.
 *
 * Each case creates its own throwaway domain, configured for that case, because
 * the deployment outcome under test is a property of the attached domain.
 */
void describe('notifications attach-mode Identity Resolution compatibility', () => {
  before(async () => {
    await createTestDirectory(rootTestDir);
    // A run that was killed outright leaves its throwaway domains behind, and
    // nothing in the next run's process knows their names. Sweeping by age on
    // both ends keeps a killed run from leaving a billable domain until the
    // hourly cleanup job comes round.
    await sweepStaleProfilesDomains();
  });

  after(async () => {
    // Safety net: a Customer Profiles domain is billable and must never outlive
    // the run, including when a test failed before its own cleanup ran.
    await cleanupAllCreatedProfilesDomains();
    await sweepStaleProfilesDomains();
    await deleteTestDirectory(rootTestDir);
  });

  /**
   * Create the throwaway domain, the test branch and the project for one case.
   * @param identityResolution Identity Resolution state of the attached domain.
   * @returns The project and the backend identifier to deploy it under.
   */
  const setupCase = async (
    identityResolution: AttachedDomainIdentityResolution,
  ): Promise<{
    project: NotificationsAttachProjectTestProject;
    backendId: BackendIdentifier;
  }> => {
    const creator = new NotificationsAttachProjectTestProjectCreator(
      identityResolution,
    );
    const project = (await creator.createProject(
      rootTestDir,
    )) as NotificationsAttachProjectTestProject;
    const testBranch: TestBranch = await amplifyAppPool.createTestBranch();
    return {
      project,
      backendId: {
        namespace: testBranch.appId,
        name: testBranch.branchName,
        type: 'branch',
      },
    };
  };

  void it('[notifications-attach] attaches to a domain with Identity Resolution disabled', async () => {
    const { project, backendId } = await setupCase('disabled');
    try {
      await project.deploy(backendId);
      await project.assertPostDeployment(backendId);
    } finally {
      await project.tearDown(backendId);
    }
  });

  void it('[notifications-attach] stops the deployment when the domain has Identity Resolution enabled', async () => {
    const { project, backendId } = await setupCase('enabled');
    try {
      await assert.rejects(
        () => project.deploy(backendId),
        (err: Error) => {
          // The CLI surfaces the CloudFormation failure reason, which carries
          // the message the deploy-time check fails with.
          assert.match(
            err.message,
            /requires a Customer Profiles domain with Identity Resolution disabled/,
            `Expected the deployment to be stopped by the Identity Resolution check, got: ${err.message}`,
          );
          assert.match(
            err.message,
            new RegExp(project.attachedDomainName),
            `Expected the failure to name the attached domain ${project.attachedDomainName}, got: ${err.message}`,
          );
          return true;
        },
      );
      // The stopped deployment must leave the customer-owned domain untouched.
      await project.assertProfileObjectTypeNotRegistered();
    } finally {
      await project.tearDown(backendId);
    }
  });
});
