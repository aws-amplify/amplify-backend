import { defineStorage } from '@aws-amplify/backend';
import { onDelete, onUpload } from '../function.js';

export const storage = defineStorage({
    name: 'testName',
    triggers: {
        onDelete,
        onUpload,
    }
});
