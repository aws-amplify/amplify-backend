/**
 * This is an example of what a project that is using the imperative amplfiy.ts definition might look like
 */
import { InlineFunction } from '../src/input-definitions/amplify-builder-base.js';
import { FileStorage } from '../src/adaptors/s3/file-storage-builder.js';
import { lambdaCallback } from './inline-lambda.js';

export const resizeImage = InlineFunction(lambdaCallback);

export const appStorage = FileStorage({}).on('stream', () => {
  console.log('do stuff');
});

resizeImage.grant('runtime', appStorage.actions('create', 'read', 'update'));
