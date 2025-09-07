import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { Operation } from '@digital-banking/models';
import { IOperationRepository } from '../interfaces';

const logger = new Logger();

/**
 * DynamoDB implementation of operation repository
 */
export class OperationRepository implements IOperationRepository {
  private dynamoClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(region = process.env.AWS_REGION || 'us-east-1') {
    const client = new DynamoDBClient({ region });
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.OPERATIONS_TABLE_NAME || `BankingSvc-OperationsTable-${process.env.ENV || 'dev'}`;
  }

  /**
   * Create a new operation record
   */
  async create(operation: Operation): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: operation
      });

      await this.dynamoClient.send(command);
      logger.info('Operation record created', { 
        operationId: operation.operationId, 
        type: operation.type, 
        accountId: operation.accountId 
      });
    } catch (error) {
      logger.error('Error creating operation record', { error, operation });
      throw error;
    }
  }

  /**
   * Get operation by ID
   */
  async getById(operationId: string): Promise<Operation | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { operationId }
      });

      const result = await this.dynamoClient.send(command);
      
      if (!result.Item) {
        logger.warn('Operation not found', { operationId });
        return null;
      }

      logger.info('Operation retrieved', { operationId });
      return result.Item as Operation;
    } catch (error) {
      logger.error('Error getting operation', { error, operationId });
      throw error;
    }
  }

  /**
   * Update operation status
   */
  async updateStatus(
    operationId: string, 
    status: 'pending' | 'completed' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      
      const updateParams: any = {
        TableName: this.tableName,
        Key: { operationId },
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':status': status
        }
      };

      if (status === 'completed' || status === 'failed') {
        updateParams.UpdateExpression += ', completedAt = :completedAt';
        updateParams.ExpressionAttributeValues[':completedAt'] = timestamp;
      }

      if (errorMessage) {
        updateParams.UpdateExpression += ', errorMessage = :errorMessage';
        updateParams.ExpressionAttributeValues[':errorMessage'] = errorMessage;
      }

      const command = new UpdateCommand(updateParams);
      await this.dynamoClient.send(command);
      
      logger.info('Operation updated', { operationId, status });
    } catch (error) {
      logger.error('Error updating operation', { error, operationId, status });
      throw error;
    }
  }
}
