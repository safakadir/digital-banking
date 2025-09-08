import { AccountProjection } from "../../models";

/**
 * Interface for account projection repository operations
 */
export interface IAccountProjectionRepository {
  /**
   * Get account projection by ID
   */
  getById(accountId: string): Promise<AccountProjection | null>;

  /**
   * Get account projections for a user
   */
  getByUserId(userId: string): Promise<AccountProjection[]>;
}
