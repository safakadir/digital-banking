import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { Operation, OutboxItem } from '@digital-banking/models';
import { DepositCommand, WithdrawCommand } from '@digital-banking/commands';
import { IOperationRepository } from '../interfaces';

const logger = new Logger();

/**
 * DynamoDB implementation of operation repository
 */
export class OperationRepository implements IOperationRepository {
  private dynamoClient: DynamoDBDocumentClient;
  private tableName: string;
  private outboxTableName: string;

  constructor(region = process.env.AWS_REGION || 'us-east-1') {
    const client = new DynamoDBClient({ region });
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.tableName =
      process.env.OPERATIONS_TABLE_NAME || `BankingSvc-OperationsTable-${process.env.ENV || 'dev'}`;
    this.outboxTableName =
      process.env.BANKING_OUTBOX_TABLE || `BankingSvc-OutboxTable-${process.env.ENV || 'dev'}`;
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
   * Create operation and send command atomically using outbox pattern
   */
  async createWithCommand(
    operation: Operation,
    command: DepositCommand | WithdrawCommand
  ): Promise<void> {
    try {
      // Create outbox item
      const outboxItem: OutboxItem = {
        id: command.id,
        timestamp: command.timestamp,
        eventType: command.type,
        eventData: command
      };

      // Atomic transaction: Write to both operations table and outbox table
      const transactCommand = new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: this.tableName,
              Item: operation
            }
          },
          {
            Put: {
              TableName: this.outboxTableName,
              Item: outboxItem
            }
          }
        ]
      });

      await this.dynamoClient.send(transactCommand);
      logger.info('Operation created atomically with command outbox', {
        operationId: operation.operationId,
        type: operation.type,
        accountId: operation.accountId,
        commandId: command.id
      });
    } catch (error) {
      logger.error('Error creating operation with command outbox', { error, operation, command });
      throw error;
    }
  }
}
