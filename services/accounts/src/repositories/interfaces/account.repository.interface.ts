import { Account, AccountStatus } from '@digital-banking/models';
import { CreateAccountEvent, CloseAccountEvent } from '@digital-banking/events';

/**
 * Interface for account repository
 */
export interface IAccountRepository {
  /**
   * Get account by ID
   * @param accountId - Account ID
   * @returns Account if found, null otherwise
   */
  getById(accountId: string): Promise<Account | null>;

  /**
   * Get all accounts for a user
   * @param userId - User ID
   * @returns Array of accounts
   */
  getByUserId(userId: string): Promise<Account[]>;

  /**
   * Create account and publish event atomically using outbox pattern
   * @param account - Account data
   * @param event - Create account event
   */
  createWithEvent(account: Account, event: CreateAccountEvent): Promise<void>;

  /**
   * Update account status and publish event atomically using outbox pattern
   * @param accountId - Account ID
   * @param status - New account status
   * @param event - Close account event
   * @param closedAt - Optional closed timestamp
   */
  updateStatusWithEvent(accountId: string, status: AccountStatus, event: CloseAccountEvent, closedAt?: string): Promise<void>;
}
