import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export const defaultDynamoDBClient = new DynamoDBClient({});
export const defaultDynamoDBDocumentClient = DynamoDBDocumentClient.from(
  defaultDynamoDBClient,
  {
    marshallOptions: {
      convertEmptyValues: true,
    },
  }
);
