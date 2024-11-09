// src/services/recordMapper.ts
export class RecordMapper {
  static mapRecordsToObjects(records: any[], tableDefinition: any) {
    return records.map(record => {
      const obj: Record<string, any> = {};
      tableDefinition.columns.forEach((column: any, index: number) => {
        const value = record[index];
        obj[column.name] = this.convertValue(value, column.type);
      });
      return obj;
    });
  }

  private static convertValue(value: any, type: string) {
    if (!value) return null;
    
    const firstKey = Object.keys(value)[0];
    const rawValue = value[firstKey];

    switch (type.toLowerCase()) {
      case 'int':
      case 'bigint':
        return Number(rawValue);
      case 'timestamp':
        return new Date(rawValue);
      default:
        return rawValue;
    }
  }
}
