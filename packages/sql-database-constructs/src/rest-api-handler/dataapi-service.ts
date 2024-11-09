import { 
  RDSDataClient, 
  ExecuteStatementCommand,
  SqlParameter 
} from '@aws-sdk/client-rds-data';
import { readJsonFromS3 } from './s3-util';

let tableDefinitionsFromS3: Record<string, any>[] | undefined = undefined;

export class DataApiService {
  private client: RDSDataClient;
  private tableDefinitions: Record<string, any>[] | undefined;
  private pathTableMap: Record<string, string>;

  constructor() {
    this.client = new RDSDataClient({});
    // this.tableDefinitions = JSON.parse(process.env.TABLE_DEFINITIONS!);
    this.pathTableMap = JSON.parse(process.env.PATH_TABLE_MAP!);
  }

  async executeStatement(sql: string, parameters: SqlParameter[] = []) {
    const command = new ExecuteStatementCommand({
      resourceArn: process.env.CLUSTER_ARN,
      secretArn: process.env.SECRET_ARN,
      database: process.env.DATABASE_NAME,
      sql,
      parameters
    });

    return this.client.send(command);
  }

  async getTableDefinition(tableName: string) {
    console.log('Before reading s3 file');
    if (!tableDefinitionsFromS3) {
      tableDefinitionsFromS3 = await readJsonFromS3(process.env.S3_TABLE_DEFINITIONS_BUCKET!, process.env.S3_TABLE_DEFINITIONS_KEY!);
      this.tableDefinitions = tableDefinitionsFromS3;
    }
    console.log('After reading s3 file');
    if (!this.tableDefinitions) {
      throw new Error('Unable to read the table definitions');
    }
    return this.tableDefinitions.find(t => t.tableName === tableName);
  }

  getTableNameFromPath(path: string) {
    return this.pathTableMap[path];
  }

  async getPrimaryKeyColumn(tableName: string) {
    const table = await this.getTableDefinition(tableName);
    if (!table) {
      throw new Error(`Table definition for ${tableName} not found`);
    }
    return table.columns.find((c: any) => c.primaryKey);
  }
}
