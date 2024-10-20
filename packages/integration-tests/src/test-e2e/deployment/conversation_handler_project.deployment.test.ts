import { ConversationHandlerTestProjectCreator } from '../../test-project-setup/conversation_handler_project.js';
import { defineDeploymentTest } from './deployment.test.template.js';

defineDeploymentTest(new ConversationHandlerTestProjectCreator());
