// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineSandboxTest } from './sandbox.test.template.js';
import { NotificationsProjectTestProjectCreator } from '../../test-project-setup/notifications_project.js';

defineSandboxTest(new NotificationsProjectTestProjectCreator());
