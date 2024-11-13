import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource.js';
import { todoCount } from './functions/todo-count/resource.js';

const backend = defineBackend({ data, todoCount });
