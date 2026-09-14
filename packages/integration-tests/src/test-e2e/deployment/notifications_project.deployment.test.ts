// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineDeploymentTest } from './deployment.test.template.js';
import { NotificationsProjectTestProjectCreator } from '../../test-project-setup/notifications_project.js';

defineDeploymentTest(new NotificationsProjectTestProjectCreator());
