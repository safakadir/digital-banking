import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  BatchGetCommand
} from '@aws-sdk/lib-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { Balance } from '@digital-banking/models';
import { IBalanceRepository } from '../interfaces';

const logger = new Logger();

/**
 * DynamoDB implementation of balance repository
 */
export class BalanceRepository implements IBalanceRepository {
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
      process.env.BALANCES_TABLE_NAME || `QuerySvc-BalancesTable-${process.env.ENV || 'dev'}`;
  }

  /**
   * Get balance for a specific account
   */
  async getByAccountId(accountId: string): Promise<Balance | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { accountId }
      });

      const result = await this.dynamoClient.send(command);

      if (!result.Item) {
        logger.warn('Balance not found', { accountId });
        return null;
      }

      logger.info('Balance retrieved', { accountId });
      return result.Item as Balance;
    } catch (error) {
      logger.error('Error getting balance', { error, accountId });
      throw error;
    }
  }

  /**
   * Get balances for multiple accounts
   */
  async getByAccountIds(accountIds: string[]): Promise<Balance[]> {
    try {
      if (accountIds.length === 0) {
        return [];
      }

      // DynamoDB BatchGet has a limit of 100 items
      const batches = [];
      for (let i = 0; i < accountIds.length; i += 100) {
        batches.push(accountIds.slice(i, i + 100));
      }

      const allBalances: Balance[] = [];

      for (const batch of batches) {
        const command = new BatchGetCommand({
          RequestItems: {
            [this.tableName]: {
              Keys: batch.map(accountId => ({ accountId }))
            }
          }
        });

        const result = await this.dynamoClient.send(command);
        const balances = (result.Responses?.[this.tableName] || []) as Balance[];
        allBalances.push(...balances);
      }

      logger.info('Balances retrieved for multiple accounts', { 
        requestedCount: accountIds.length, 
        foundCount: allBalances.length 
      });
      
      return allBalances;
    } catch (error) {
      logger.error('Error getting balances for multiple accounts', { error, accountIds });
      throw error;
    }
  }

}
