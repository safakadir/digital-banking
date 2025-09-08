import { Balance } from '@digital-banking/models';

/**
 * Interface for balance repository operations
 */
export interface IBalanceRepository {
  /**
   * Get balance for a specific account
   */
  getByAccountId(accountId: string): Promise<Balance | null>;

  /**
   * Get balances for multiple accounts
   */
  getByAccountIds(accountIds: string[]): Promise<Balance[]>;
}
