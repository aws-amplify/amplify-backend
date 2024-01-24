import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";


export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    return {
        statusCode: 200,
        body: `Hello World! ${new Date().toISOString()}\n`,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
        }
    };
}
