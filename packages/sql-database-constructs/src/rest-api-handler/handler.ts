// src/lambda/handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DataApiService } from './dataapi-service.js';
import { QueryBuilder } from './query-builder.js';
import { RecordMapper } from './record-mapper.js';

const dataApiService = new DataApiService();

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    console.log('Event:', JSON.stringify(event, null, 2));
    const { httpMethod, resource, pathParameters, body } = event;
    const path = resource.split('/')[1];
    const tableName = dataApiService.getTableNameFromPath(path);
    const tableDefinition = await dataApiService.getTableDefinition(tableName);

    if (!tableDefinition) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Table not found' })
      };
    }

    const columns = (await dataApiService.getTableDefinition(tableName))!.columns.map((c: any) => c.name);
    let result;
    switch (httpMethod) {
      case 'GET':
        if (pathParameters?.id) {
          const query = QueryBuilder.buildSelect(
            tableName,
            columns,
            pathParameters.id,
          );
          result = await dataApiService.executeStatement(query.sql, query.parameters);
        } else {
          const query = QueryBuilder.buildSelect(tableName, (await dataApiService.getTableDefinition(tableName))!.columns.map((c: any) => c.name));
          result = await dataApiService.executeStatement(query.sql);
        }
        break;

      case 'POST':
        const insertData = JSON.parse(body!);
        const insertQuery = QueryBuilder.buildInsert(tableName, insertData, columns);
        result = await dataApiService.executeStatement(
          insertQuery.sql, 
          insertQuery.parameters,
        );
        break;

      case 'PUT':
        const updateData = JSON.parse(body!);
        const updateQuery = QueryBuilder.buildUpdate(
          tableName, 
          pathParameters!.id!, 
          updateData,
          columns,
        );
        result = await dataApiService.executeStatement(
          updateQuery.sql, 
          updateQuery.parameters,
        );
        break;

      case 'DELETE':
        const deleteQuery = QueryBuilder.buildDelete(tableName, pathParameters!.id!);
        await dataApiService.executeStatement(deleteQuery.sql, deleteQuery.parameters);
        return { statusCode: 204, body: '' };

      default:
        return {
          statusCode: 405,
          body: JSON.stringify({ message: 'Method not allowed' })
        };
    }

    const mappedResults = RecordMapper.mapRecordsToObjects(
      result.records || [], 
      tableDefinition
    );

    return {
      statusCode: 200,
      body: JSON.stringify(mappedResults)
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
}
