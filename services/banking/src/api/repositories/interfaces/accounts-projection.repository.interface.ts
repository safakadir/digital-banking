export interface IAccountsProjectionRepository {
  /**
   * Validate account ownership
   * @param accountId - Account ID
   * @param userId - User ID
   * @returns True if user owns the account and it's active
   */
  validateOwnership(accountId: string, userId: string): Promise<boolean>;
}
