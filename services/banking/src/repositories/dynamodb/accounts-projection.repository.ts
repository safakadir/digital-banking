import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { AccountStatus } from '@digital-banking/models';
import { IAccountsProjectionRepository } from '../interfaces';
import { AccountProjection } from '../../models/account-projection';

const logger = new Logger();

/**
 * DynamoDB implementation of accounts projection repository
 */
export class AccountsProjectionRepository implements IAccountsProjectionRepository {
  private dynamoClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(region = process.env.AWS_REGION || 'us-east-1') {
    const client = new DynamoDBClient({ region });
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.ACCOUNTS_PROJECTION_TABLE_NAME || `BankingSvc-AccountsProjectionTable-${process.env.ENV || 'dev'}`;
  }

  /**
   * Get account projection by ID for ownership validation
   */
  async getById(accountId: string): Promise<AccountProjection | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { id: accountId }
      });

      const result = await this.dynamoClient.send(command);
      
      if (!result.Item) {
        logger.warn('Account projection not found', { accountId });
        return null;
      }

      // Map DynamoDB item to AccountProjection model
      const item = result.Item;
      const accountProjection: AccountProjection = {
        accountId: item.id,
        userId: item.user_id,
        status: item.status
      };

      logger.info('Account projection retrieved', { accountId });
      return accountProjection;
    } catch (error) {
      logger.error('Error getting account projection', { error, accountId });
      throw error;
    }
  }

  /**
   * Create or update account projection
   */
  async upsert(accountProjection: AccountProjection): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: {
          id: accountProjection.accountId,
          user_id: accountProjection.userId,
          status: accountProjection.status
        }
      });

      await this.dynamoClient.send(command);
      logger.info('Account projection updated', { 
        accountId: accountProjection.accountId, 
        userId: accountProjection.userId,
        status: accountProjection.status 
      });
    } catch (error) {
      logger.error('Error upserting account projection', { 
        error, 
        accountId: accountProjection.accountId 
      });
      throw error;
    }
  }

  /**
   * Update account status (e.g., when closing account)
   */
  async updateStatus(accountId: string, status: AccountStatus): Promise<void> {
    try {
      const updateCommand = new UpdateCommand({
        TableName: this.tableName,
        Key: { id: accountId },
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':status': status
        }
      });
      
      await this.dynamoClient.send(updateCommand);
      logger.info('Account status updated in projection', { accountId, status });
    } catch (error) {
      logger.error('Error updating account status in projection', { error, accountId, status });
      throw error;
    }
  }

  /**
   * Delete account projection (for hard deletes if needed)
   */
  async delete(accountId: string): Promise<void> {
    try {
      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: { id: accountId }
      });

      await this.dynamoClient.send(command);
      logger.info('Account projection deleted', { accountId });
    } catch (error) {
      logger.error('Error deleting account projection', { error, accountId });
      throw error;
    }
  }

  /**
   * Validate account ownership
   */
  async validateOwnership(accountId: string, userId: string): Promise<boolean> {
    try {
      const accountProjection = await this.getById(accountId);
      
      if (!accountProjection) {
        logger.warn('Account projection not found for ownership validation', { accountId, userId });
        return false;
      }

      if (accountProjection.userId !== userId) {
        logger.warn('Account ownership validation failed - wrong user', { 
          accountId, 
          userId, 
          accountUserId: accountProjection.userId 
        });
        return false;
      }

      if (accountProjection.status !== AccountStatus.ACTIVE) {
        logger.warn('Account ownership validation failed - account not active', { 
          accountId, 
          userId, 
          status: accountProjection.status 
        });
        return false;
      }

      logger.info('Account ownership validation successful', { accountId, userId });
      return true;
    } catch (error) {
      logger.error('Error validating account ownership', { error, accountId, userId });
      throw error;
    }
  }
}
