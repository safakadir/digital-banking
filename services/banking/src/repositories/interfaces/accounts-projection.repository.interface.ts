import { AccountStatus } from '@digital-banking/models';
import { AccountProjection } from '../../models/account-projection';

/**
 * Interface for accounts projection repository
 */
export interface IAccountsProjectionRepository {
  /**
   * Get account projection by ID for ownership validation
   * @param accountId - Account ID
   * @returns Account projection if found, null otherwise
   */
  getById(accountId: string): Promise<AccountProjection | null>;

  /**
   * Create or update account projection
   * @param accountProjection - Account projection data
   */
  upsert(accountProjection: AccountProjection): Promise<void>;

  /**
   * Update account status (e.g., when closing account)
   * @param accountId - Account ID
   * @param status - New account status
   */
  updateStatus(accountId: string, status: AccountStatus): Promise<void>;

  /**
   * Delete account projection (for hard deletes if needed)
   * @param accountId - Account ID
   */
  delete(accountId: string): Promise<void>;

  /**
   * Validate account ownership
   * @param accountId - Account ID
   * @param userId - User ID
   * @returns True if user owns the account and it's active
   */
  validateOwnership(accountId: string, userId: string): Promise<boolean>;
}
