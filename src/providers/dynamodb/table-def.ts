import { AmplifyBuilderBase, ResourceDefinition } from '../../manifest/amplify-builder-base';

type Key = {
  name: string;
  type?: 'S' | 'N';
};

type Index = {
  primaryKey: Key;
  sortKey?: Key;
};

/**
 * Types and class for DynamoDB table
 */
type TableProps = Index & {
  readCapacity: number;
  writeCapacity: number;
  secondaryIndexes?: (Index & { indexName: string })[];
};
type NoSQLTableProps = ResourceDefinition<TableProps, 'stream', never>;
type NoSQLActions = 'create' | 'read' | 'update' | 'delete' | 'list';
export class AmplifyNoSQLTable extends AmplifyBuilderBase<NoSQLTableProps, NoSQLActions> {
  constructor(public readonly props: NoSQLTableProps) {
    super('@aws-amplify/file-storage-provider');
  }
}
export const NoSQLTable = (props: NoSQLTableProps) => new AmplifyNoSQLTable(props);
