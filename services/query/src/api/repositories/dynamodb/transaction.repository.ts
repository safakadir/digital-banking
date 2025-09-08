import {
  DynamoDBDocumentClient,
  QueryCommand
} from '@aws-sdk/lib-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { Transaction } from '@digital-banking/models';
import { ITransactionRepository } from '../interfaces';

const logger = new Logger();

/**
 * DynamoDB implementation of transaction repository
 */
export class TransactionRepository implements ITransactionRepository {
  constructor(
    private readonly dynamoClient: DynamoDBDocumentClient,
    private readonly tableName: string
  ) {}

  /**
   * Get transactions for a specific account
   */
  async getByAccountId(accountId: string, limit = 50, offset = 0): Promise<Transaction[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'account-timestamp-lsi', // Use the timestamp-based LSI
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
   * Helper method to generate offset key for pagination
   * In a real implementation, you'd want to use the LastEvaluatedKey from previous queries
   */
  private getOffsetKey(offset: number): string {
    // This is a simplified implementation
    // In practice, you'd maintain pagination tokens or use scan index forward with proper keys
    return new Date(Date.now() - offset * 1000).toISOString();
  }
}
