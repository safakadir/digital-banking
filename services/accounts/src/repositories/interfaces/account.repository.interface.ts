import { Account, AccountStatus } from '@digital-banking/models';

/**
 * Interface for account repository
 */
export interface IAccountRepository {
  /**
   * Create a new account
   * @param account - Account data
   */
  create(account: Account): Promise<void>;

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
   * Update account status
   * @param accountId - Account ID
   * @param status - New account status
   * @param closedAt - Optional closed timestamp
   */
  updateStatus(accountId: string, status: AccountStatus, closedAt?: string): Promise<void>;

  /**
   * Update account
   * @param accountId - Account ID
   * @param updates - Partial account data to update
   */
  update(accountId: string, updates: Partial<Account>): Promise<void>;

  /**
   * Delete account (for hard deletes if needed)
   * @param accountId - Account ID
   */
  delete(accountId: string): Promise<void>;

  /**
   * Check if account exists
   * @param accountId - Account ID
   * @returns True if account exists
   */
  exists(accountId: string): Promise<boolean>;
}
