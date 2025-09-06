import { AccountService } from "./account-service";

/**
 * Creates a BankingService instance
 * This factory function allows for easier mocking in tests
 * @returns BankingService instance
 */
export function createAccountService(): AccountService {
  return new AccountService();
}

// Export service classes for direct usage if needed
export { AccountService };
