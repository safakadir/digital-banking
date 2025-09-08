import { Logger } from '@aws-lambda-powertools/logger';
import { v4 as uuidv4 } from 'uuid';
import { Account, AccountStatus } from '@digital-banking/models';
import { CreateAccountRequest } from './dto';
import { CreateAccountEvent, CloseAccountEvent } from '@digital-banking/events';
import { NotFoundError, ConflictError } from '@digital-banking/errors';
import { IAccountRepository } from './repositories';

// Powertools
const logger = new Logger();

/**
 * Account Service - Business logic for account operations
 */
export class AccountService {
  private accountRepository: IAccountRepository;

  constructor(accountRepository: IAccountRepository) {
    this.accountRepository = accountRepository;
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

    // Create event for outbox
    const event: CreateAccountEvent = {
      id: uuidv4(),
      type: 'CREATE_ACCOUNT_EVENT',
      timestamp: now,
      accountId,
      userId,
      name: data.name,
      currency: data.currency
    };

    try {
      // Use repository transaction method for atomic operation
      await this.accountRepository.createWithEvent(account, event);
      logger.info('Account created successfully via repository', { accountId, eventId: event.id });

      return account;
    } catch (error) {
      logger.error('Error creating account', { error, accountId });
      throw new Error(
        `Failed to create account: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Close an existing account
   */
  async closeAccount(accountId: string, reason?: string): Promise<void> {
    logger.info('Closing account in service', { accountId });

    // Get account from database
    const account = await this.accountRepository.getById(accountId);

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

    // Create event for outbox
    const event: CloseAccountEvent = {
      id: uuidv4(),
      type: 'CLOSE_ACCOUNT_EVENT',
      timestamp: now,
      accountId,
      userId: account.userId,
      reason
    };

    try {
      // Use repository transaction method for atomic operation
      await this.accountRepository.updateStatusWithEvent(
        accountId,
        AccountStatus.CLOSED,
        event,
        now
      );
      logger.info('Account closed successfully via repository', { accountId, eventId: event.id });
    } catch (error) {
      logger.error('Error closing account', { error, accountId });
      throw new Error(
        `Failed to close account: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get account details
   */
  async getAccount(accountId: string): Promise<Account> {
    logger.info('Getting account details in service', { accountId });

    const account = await this.accountRepository.getById(accountId);

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
      const accounts = await this.accountRepository.getByUserId(userId);

      // Return full accounts
      return { accounts };
    } catch (error) {
      logger.error('Error getting accounts', { error });
      throw new Error(
        `Failed to get accounts: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
