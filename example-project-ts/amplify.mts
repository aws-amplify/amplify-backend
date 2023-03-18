import { InlineFunction } from '../src/manifest/amplify-builder-base.js';
import { FileStorage } from '../src/providers/s3-provider/file-storage-builder.js';
import { inlineLambda } from './inline-lambda.js';

export const resizeImage = await InlineFunction(inlineLambda);

export const appStorage = await FileStorage({}).on('stream', resizeImage);

resizeImage.grant('runtime', appStorage.actions('create', 'read', 'update'));
