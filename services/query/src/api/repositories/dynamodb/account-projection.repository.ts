import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand
} from '@aws-sdk/lib-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { IAccountProjectionRepository } from '../interfaces/account-projection.repository.interface';
import { AccountProjection } from '../../models';

const logger = new Logger();

/**
 * DynamoDB implementation of account projection repository
 */
export class AccountProjectionRepository implements IAccountProjectionRepository {
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
      process.env.ACCOUNTS_PROJECTION_TABLE_NAME || `QuerySvc-AccountsProjectionTable-${process.env.ENV || 'dev'}`;
  }

  /**
   * Get account projection by ID
   */
  async getById(accountId: string): Promise<AccountProjection | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { accountId }
      });

      const result = await this.dynamoClient.send(command);

      if (!result.Item) {
        logger.warn('Account projection not found', { accountId });
        return null;
      }

      logger.info('Account projection retrieved', { accountId });
      return result.Item as AccountProjection;
    } catch (error) {
      logger.error('Error getting account projection', { error, accountId });
      throw error;
    }
  }

  /**
   * Get account projections for a user
   */
  async getByUserId(userId: string): Promise<AccountProjection[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'UserIdIndex', // GSI on userId
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      });

      const result = await this.dynamoClient.send(command);
      const accounts = (result.Items || []) as AccountProjection[];

      logger.info('Account projections retrieved for user', { userId, count: accounts.length });
      return accounts;
    } catch (error) {
      logger.error('Error getting account projections by user ID', { error, userId });
      throw error;
    }
  }

}
