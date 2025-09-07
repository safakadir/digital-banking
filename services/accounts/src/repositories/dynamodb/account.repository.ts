import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { Account, AccountStatus } from '@digital-banking/models';
import { IAccountRepository } from '../interfaces';

const logger = new Logger();

/**
 * DynamoDB implementation of account repository
 */
export class AccountRepository implements IAccountRepository {
  private dynamoClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(region = process.env.AWS_REGION || 'us-east-1') {
    const client = new DynamoDBClient({ region });
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.ACCOUNTS_TABLE_NAME || `AccountsSvc-AccountsTable-${process.env.ENV || 'dev'}`;
  }

  /**
   * Create a new account
   */
  async create(account: Account): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: account,
        ConditionExpression: 'attribute_not_exists(accountId)' // Prevent overwriting existing accounts
      });

      await this.dynamoClient.send(command);
      logger.info('Account created', { accountId: account.accountId });
    } catch (error) {
      logger.error('Error creating account', { error, accountId: account.accountId });
      throw error;
    }
  }

  /**
   * Get account by ID
   */
  async getById(accountId: string): Promise<Account | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { accountId }
      });

      const result = await this.dynamoClient.send(command);
      
      if (!result.Item) {
        logger.warn('Account not found', { accountId });
        return null;
      }

      logger.info('Account retrieved', { accountId });
      return result.Item as Account;
    } catch (error) {
      logger.error('Error getting account', { error, accountId });
      throw error;
    }
  }

  /**
   * Get all accounts for a user
   */
  async getByUserId(userId: string): Promise<Account[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'UserIdIndex', // Assuming GSI on userId
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      });

      const result = await this.dynamoClient.send(command);
      const accounts = (result.Items || []) as Account[];
      
      logger.info('Accounts retrieved for user', { userId, count: accounts.length });
      return accounts;
    } catch (error) {
      logger.error('Error getting accounts by user ID', { error, userId });
      throw error;
    }
  }

  /**
   * Update account status
   */
  async updateStatus(accountId: string, status: AccountStatus, closedAt?: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      let updateExpression = 'SET #status = :status, #updatedAt = :updatedAt';
      const expressionAttributeNames: Record<string, string> = {
        '#status': 'status',
        '#updatedAt': 'updatedAt'
      };
      const expressionAttributeValues: Record<string, any> = {
        ':status': status,
        ':updatedAt': now
      };

      if (closedAt) {
        updateExpression += ', #closedAt = :closedAt';
        expressionAttributeNames['#closedAt'] = 'closedAt';
        expressionAttributeValues[':closedAt'] = closedAt;
      }

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { accountId },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      });
      
      await this.dynamoClient.send(command);
      logger.info('Account status updated', { accountId, status, closedAt });
    } catch (error) {
      logger.error('Error updating account status', { error, accountId, status });
      throw error;
    }
  }

  /**
   * Update account
   */
  async update(accountId: string, updates: Partial<Account>): Promise<void> {
    try {
      const now = new Date().toISOString();
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // Always update the updatedAt timestamp
      updateExpressions.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = now;

      // Add other fields to update
      Object.entries(updates).forEach(([key, value], index) => {
        if (key !== 'accountId' && key !== 'updatedAt' && value !== undefined) {
          const attrName = `#attr${index}`;
          const attrValue = `:val${index}`;
          updateExpressions.push(`${attrName} = ${attrValue}`);
          expressionAttributeNames[attrName] = key;
          expressionAttributeValues[attrValue] = value;
        }
      });

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { accountId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      });
      
      await this.dynamoClient.send(command);
      logger.info('Account updated', { accountId, updates: Object.keys(updates) });
    } catch (error) {
      logger.error('Error updating account', { error, accountId, updates });
      throw error;
    }
  }

  /**
   * Delete account (for hard deletes if needed)
   */
  async delete(accountId: string): Promise<void> {
    try {
      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: { accountId }
      });

      await this.dynamoClient.send(command);
      logger.info('Account deleted', { accountId });
    } catch (error) {
      logger.error('Error deleting account', { error, accountId });
      throw error;
    }
  }

  /**
   * Check if account exists
   */
  async exists(accountId: string): Promise<boolean> {
    try {
      const account = await this.getById(accountId);
      return account !== null;
    } catch (error) {
      logger.error('Error checking account existence', { error, accountId });
      throw error;
    }
  }
}
