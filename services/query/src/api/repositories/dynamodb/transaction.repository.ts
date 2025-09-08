import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand
} from '@aws-sdk/lib-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { Transaction } from '@digital-banking/models';
import { ITransactionRepository } from '../interfaces';

const logger = new Logger();

/**
 * DynamoDB implementation of transaction repository
 */
export class TransactionRepository implements ITransactionRepository {
  private dynamoClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(region = process.env.AWS_REGION || 'us-east-1') {
    const client = new DynamoDBClient({ region });
    this.dynamoClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true
      }
    });
    this.tableName =
      process.env.TRANSACTIONS_TABLE_NAME || `QuerySvc-TransactionsTable-${process.env.ENV || 'dev'}`;
  }

  /**
   * Get transactions for a specific account
   */
  async getByAccountId(accountId: string, limit = 50, offset = 0): Promise<Transaction[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'accountId = :accountId',
        ExpressionAttributeValues: {
          ':accountId': accountId
        },
        ScanIndexForward: false, // Sort by timestamp descending (newest first)
        Limit: limit,
        ExclusiveStartKey: offset > 0 ? { accountId, timestamp: this.getOffsetKey(offset) } : undefined
      });

      const result = await this.dynamoClient.send(command);
      const transactions = (result.Items || []) as Transaction[];

      logger.info('Transactions retrieved', { accountId, count: transactions.length, limit, offset });
      return transactions;
    } catch (error) {
      logger.error('Error getting transactions', { error, accountId, limit, offset });
      throw error;
    }
  }

  /**
   * Create a new transaction record
   */
  async create(transaction: Transaction): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: transaction
      });

      await this.dynamoClient.send(command);
      logger.info('Transaction created', { transactionId: transaction.id, accountId: transaction.accountId });
    } catch (error) {
      logger.error('Error creating transaction', { error, transaction });
      throw error;
    }
  }

  /**
   * Get total transaction count for an account
   */
  async getCountByAccountId(accountId: string): Promise<number> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'accountId = :accountId',
        ExpressionAttributeValues: {
          ':accountId': accountId
        },
        Select: 'COUNT'
      });

      const result = await this.dynamoClient.send(command);
      const count = result.Count || 0;

      logger.info('Transaction count retrieved', { accountId, count });
      return count;
    } catch (error) {
      logger.error('Error getting transaction count', { error, accountId });
      throw error;
    }
  }

  /**
   * Helper method to generate offset key for pagination
   * In a real implementation, you'd want to use the LastEvaluatedKey from previous queries
   */
  private getOffsetKey(offset: number): string {
    // This is a simplified implementation
    // In practice, you'd maintain pagination tokens or use scan index forward with proper keys
    return new Date(Date.now() - offset * 1000).toISOString();
  }
}
