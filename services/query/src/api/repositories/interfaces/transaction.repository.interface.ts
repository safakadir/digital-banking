import { Transaction } from '@digital-banking/models';

/**
 * Interface for transaction repository operations
 */
export interface ITransactionRepository {
  /**
   * Get transactions for a specific account
   */
  getByAccountId(accountId: string, limit?: number, offset?: number): Promise<Transaction[]>;

  /**
   * Get total transaction count for an account
   */
  getCountByAccountId(accountId: string): Promise<number>;
}
