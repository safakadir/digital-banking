import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  TransactWriteCommand
} from '@aws-sdk/lib-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { Account, AccountStatus, OutboxItem } from '@digital-banking/models';
import { CreateAccountEvent, CloseAccountEvent } from '@digital-banking/events';
import { IAccountRepository } from '../interfaces';

const logger = new Logger();

/**
 * DynamoDB implementation of account repository
 */
export class AccountRepository implements IAccountRepository {
  private dynamoClient: DynamoDBDocumentClient;
  private tableName: string;
  private outboxTableName: string;

  constructor(region = process.env.AWS_REGION || 'us-east-1') {
    const client = new DynamoDBClient({ region });
    this.dynamoClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true
      }
    });
    this.tableName =
      process.env.ACCOUNTS_TABLE_NAME || `AccountsSvc-AccountsTable-${process.env.ENV || 'dev'}`;
    this.outboxTableName =
      process.env.ACCOUNTS_OUTBOX_TABLE || `AccountsSvc-OutboxTable-${process.env.ENV || 'dev'}`;
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
   * Create account and publish event atomically using outbox pattern
   */
  async createWithEvent(account: Account, event: CreateAccountEvent): Promise<void> {
    try {
      // Create outbox item
      const outboxItem: OutboxItem = {
        id: event.id,
        timestamp: event.timestamp,
        eventType: event.type,
        eventData: event
      };

      // Atomic transaction: Write to both accounts table and outbox table
      const transactCommand = new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: this.tableName,
              Item: account,
              ConditionExpression: 'attribute_not_exists(accountId)' // Prevent overwriting existing accounts
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
      logger.info('Account created atomically with outbox event', {
        accountId: account.accountId,
        eventId: event.id
      });
    } catch (error) {
      logger.error('Error creating account with outbox event', {
        error,
        accountId: account.accountId
      });
      throw error;
    }
  }

  /**
   * Update account status and publish event atomically using outbox pattern
   */
  async updateStatusWithEvent(
    accountId: string,
    status: AccountStatus,
    event: CloseAccountEvent,
    closedAt?: string
  ): Promise<void> {
    try {
      const now = new Date().toISOString();

      // Create outbox item
      const outboxItem: OutboxItem = {
        id: event.id,
        timestamp: event.timestamp,
        eventType: event.type,
        eventData: event
      };

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

      // Atomic transaction: Update account status and write to outbox table
      const transactCommand = new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: this.tableName,
              Key: { accountId },
              UpdateExpression: updateExpression,
              ExpressionAttributeNames: expressionAttributeNames,
              ExpressionAttributeValues: expressionAttributeValues
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
      logger.info('Account status updated atomically with outbox event', {
        accountId,
        status,
        eventId: event.id
      });
    } catch (error) {
      logger.error('Error updating account status with outbox event', { error, accountId, status });
      throw error;
    }
  }
}
