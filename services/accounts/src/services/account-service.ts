import { Logger } from '@aws-lambda-powertools/logger';
import { v4 as uuidv4 } from 'uuid';
import { 
  Account, 
  AccountStatus 
} from '@digital-banking/models';
import { CreateAccountRequest } from '../dto';
import { 
  CreateAccountEvent, 
  CloseAccountEvent 
} from '@digital-banking/events';
import { 
  DynamoDBUtil,
  EventPublisher 
} from '@digital-banking/utils';
import {
  ValidationError,
  NotFoundError,
  ConflictError
} from '@digital-banking/errors';

// Powertools
const logger = new Logger();

/**
 * Account Service - Business logic for account operations
 */
export class AccountService {
  private dynamoDb: DynamoDBUtil;
  private eventPublisher: EventPublisher;
  private accountsTableName: string;

  constructor() {
    this.dynamoDb = new DynamoDBUtil();
    this.eventPublisher = new EventPublisher();
    this.accountsTableName = process.env.ACCOUNTS_TABLE_NAME || 'Accounts';
  }

  /**
   * Create a new account
   */
  async createAccount(userId: string, data: CreateAccountRequest): Promise<Account> {
    logger.info('Creating new account in service', { userId, data });
    
    // Generate a new account ID
    const accountId = `acc_${uuidv4().replace(/-/g, '')}`;
    const now = new Date().toISOString();
    
    // Create account in database
    const account: Account = {
      accountId,
      userId,
      name: data.name,
      currency: data.currency,
      status: AccountStatus.ACTIVE,
      createdAt: now,
      updatedAt: now
    };
    
    try {
      await this.dynamoDb.putItem(this.accountsTableName, account);
      
      // Publish CREATE_ACCOUNT_EVENT
      const event: CreateAccountEvent = {
        id: uuidv4(),
        type: 'CREATE_ACCOUNT_EVENT',
        timestamp: now,
        accountId,
        userId,
        name: data.name,
        currency: data.currency
      };
      
      await this.eventPublisher.publishEvent(event);
      
      return account;
    } catch (error) {
      logger.error('Error creating account', { error });
      throw new Error(`Failed to create account: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Close an existing account
   */
  async closeAccount(accountId: string, reason?: string): Promise<void> {
    logger.info('Closing account in service', { accountId });
    
    // Get account from database
    const account = await this.getAccountFromDb(accountId);
    
    // These checks should be moved to validators, but keeping minimal validation
    // for data integrity at the service level
    if (!account) {
      throw new NotFoundError(`Account ${accountId} not found`);
    }
    
    if (account.status === AccountStatus.CLOSED) {
      throw new ConflictError(`Account ${accountId} is already closed`);
    }
    
    // Update account status in database
    const now = new Date().toISOString();
    
    try {
      await this.dynamoDb.updateItem(
        this.accountsTableName,
        { accountId },
        'SET #status = :status, #updatedAt = :updatedAt, #closedAt = :closedAt',
        {
          ':status': AccountStatus.CLOSED,
          ':updatedAt': now,
          ':closedAt': now
        },
        {
          '#status': 'status',
          '#updatedAt': 'updatedAt',
          '#closedAt': 'closedAt'
        }
      );
      
      // Publish CLOSE_ACCOUNT_EVENT
      const event: CloseAccountEvent = {
        id: uuidv4(),
        type: 'CLOSE_ACCOUNT_EVENT',
        timestamp: now,
        accountId,
        userId: account.userId,
        reason
      };
      
      await this.eventPublisher.publishEvent(event);
    } catch (error) {
      logger.error('Error closing account', { error });
      throw new Error(`Failed to close account: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get account details
   */
  async getAccount(accountId: string): Promise<Account> {
    logger.info('Getting account details in service', { accountId });
    
    const account = await this.getAccountFromDb(accountId);
    
    // Keeping this check for data integrity
    if (!account) {
      throw new NotFoundError(`Account ${accountId} not found`);
    }
    
    return account;
  }

  /**
   * Get all accounts for a user
   */
  async getAccounts(userId: string): Promise<{ accounts: Account[] }> {
    logger.info('Getting all accounts in service', { userId });
    
    try {
      // Query accounts by userId
      const accounts = await this.dynamoDb.query<Account>({
        TableName: this.accountsTableName,
        IndexName: 'UserIdIndex', // Assuming a GSI on userId
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      });
      
      // Return full accounts
      return { accounts };
    } catch (error) {
      logger.error('Error getting accounts', { error });
      throw new Error(`Failed to get accounts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Helper method to get account from database
   */
  private async getAccountFromDb(accountId: string): Promise<Account | undefined> {
    try {
      return await this.dynamoDb.getItem<Account>(this.accountsTableName, { accountId });
    } catch (error) {
      logger.error('Error fetching account from database', { accountId, error });
      throw new Error(`Failed to fetch account: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
