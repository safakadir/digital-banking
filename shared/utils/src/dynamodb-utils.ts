import { 
  DynamoDBClient, 
  DynamoDBClientConfig 
} from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  UpdateCommand, 
  QueryCommand,
  QueryCommandInput,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';

/**
 * DynamoDB utility class for common database operations
 */
export class DynamoDBUtil {
  private client: DynamoDBClient;
  private docClient: DynamoDBDocumentClient;

  /**
   * Create a new DynamoDBUtil instance
   * @param config DynamoDB client configuration
   */
  constructor(config: DynamoDBClientConfig = {}) {
    // Use provided config or default to environment region
    const finalConfig: DynamoDBClientConfig = {
      region: process.env.AWS_REGION || 'us-east-1',
      ...config
    };
    
    this.client = new DynamoDBClient(finalConfig);
    this.docClient = DynamoDBDocumentClient.from(this.client);
  }

  /**
   * Put an item in a DynamoDB table
   * @param tableName The name of the table
   * @param item The item to put
   * @returns The result of the put operation
   */
  async putItem<T>(tableName: string, item: T) {
    const command = new PutCommand({
      TableName: tableName,
      Item: item as Record<string, any>,
    });

    return this.docClient.send(command);
  }

  /**
   * Get an item from a DynamoDB table
   * @param tableName The name of the table
   * @param key The key of the item to get
   * @returns The item, or undefined if not found
   */
  async getItem<T>(tableName: string, key: Record<string, any>): Promise<T | undefined> {
    const command = new GetCommand({
      TableName: tableName,
      Key: key,
    });

    const response = await this.docClient.send(command);
    return response.Item as T | undefined;
  }

  /**
   * Update an item in a DynamoDB table
   * @param tableName The name of the table
   * @param key The key of the item to update
   * @param updateExpression The update expression
   * @param expressionAttributeValues The expression attribute values
   * @param expressionAttributeNames The expression attribute names
   * @returns The result of the update operation
   */
  async updateItem(
    tableName: string,
    key: Record<string, any>,
    updateExpression: string,
    expressionAttributeValues: Record<string, any>,
    expressionAttributeNames?: Record<string, string>
  ) {
    const command = new UpdateCommand({
      TableName: tableName,
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
      ReturnValues: 'ALL_NEW',
    });

    return this.docClient.send(command);
  }

  /**
   * Query items from a DynamoDB table
   * @param params The query parameters
   * @returns The query result
   */
  async query<T>(params: QueryCommandInput): Promise<T[]> {
    const command = new QueryCommand(params);
    const response = await this.docClient.send(command);
    return (response.Items || []) as T[];
  }

  /**
   * Delete an item from a DynamoDB table
   * @param tableName The name of the table
   * @param key The key of the item to delete
   * @returns The result of the delete operation
   */
  async deleteItem(tableName: string, key: Record<string, any>) {
    const command = new DeleteCommand({
      TableName: tableName,
      Key: key,
    });

    return this.docClient.send(command);
  }
}
