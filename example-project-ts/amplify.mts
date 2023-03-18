import { InlineFunction } from '../src/manifest/amplify-builder-base.js';
import { FileStorage } from '../src/providers/s3-provider/file-storage-builder.js';

export const resizeImage = await InlineFunction(async (event: any) => {
  const result = 'inline lambda';
  await new Promise((resolve) => setTimeout(resolve, 100));
  console.log(result);
  console.log(JSON.stringify(event));
  return result;
});

export const appStorage = await FileStorage({}).on('stream', resizeImage);

resizeImage.grant('runtime', appStorage.actions('create', 'read', 'update'));
