import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource.js';
import { todoCount } from './functions/todo-count/resource.js';
import { customerS3Import } from './functions/customer-s3-import/resource.js';

const backend = defineBackend({ data, todoCount, customerS3Import });
