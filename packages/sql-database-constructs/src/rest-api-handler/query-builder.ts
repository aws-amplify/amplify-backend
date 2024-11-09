// src/services/queryBuilder.ts
import { SqlParameter } from '@aws-sdk/client-rds-data';

export class QueryBuilder {
  static buildSelect(tableName: string, columns: string[], id?: string | number) {
    if (id) {
      return {
        sql: `SELECT ${columns.join(',')} FROM "${tableName}" WHERE id = :id`,
        parameters: [{ name: 'id', value: { longValue: Number(id) } }]
      };
    }
    return {
      sql: `SELECT ${columns.join(',')} FROM "${tableName}"`,
      parameters: []
    };
  }

  static buildInsert(tableName: string, data: Record<string, any>, columnNames: string[]) {
    const columns = Object.keys(data);
    const paramNames = columns.map(c => `:${c}`);
    const parameters: SqlParameter[] = columns.map(column => ({
      name: column,
      value: this.convertToParameterValue(data[column])
    }));

    return {
      sql: `INSERT INTO "${tableName}" (${columns.join(', ')}) 
            VALUES (${paramNames.join(', ')}) RETURNING ${columnNames.join(',')}`,
      parameters
    };
  }

  static buildUpdate(tableName: string, id: string | number, data: Record<string, any>, columnNames: string[]) {
    const updates = Object.keys(data)
      .map(column => `${column} = :${column}`)
      .join(', ');
    
    const parameters: SqlParameter[] = [
      { name: 'id', value: { longValue: Number(id) } },
      ...Object.entries(data).map(([column, value]) => ({
        name: column,
        value: this.convertToParameterValue(value)
      }))
    ];

    return {
      sql: `UPDATE "${tableName}" SET ${updates} WHERE id = :id RETURNING ${columnNames.join(',')}`,
      parameters
    };
  }

  static buildDelete(tableName: string, id: string | number) {
    return {
      sql: `DELETE FROM "${tableName}" WHERE id = :id`,
      parameters: [{ name: 'id', value: { longValue: Number(id) } }]
    };
  }

  private static convertToParameterValue(value: any) {
    if (typeof value === 'number') {
      return { longValue: value };
    }
    if (value instanceof Date) {
      return { stringValue: value.toISOString() };
    }
    return { stringValue: String(value) };
  }
}
