import { AmplifyBuilderBase } from '../../manifest/amplify-builder-base';
import { FileStorageConfig } from './s3-provider';

type FileStorageActions = 'create' | 'read' | 'update' | 'delete' | 'list';

class AmplifyFileStorage extends AmplifyBuilderBase<FileStorageConfig, 'stream', never, FileStorageActions, string> {
  constructor(public readonly props: FileStorageConfig) {
    super('@aws-amplify/file-storage-adaptor', props);
  }
}
export const FileStorage = (props: FileStorageConfig) => new AmplifyFileStorage(props);
