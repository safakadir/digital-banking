import { AccountService } from "./account-service";
import { AccountRepository } from "../repositories";

/**
 * Creates an AccountService instance with its dependencies
 * This factory function allows for easier mocking in tests
 * @returns AccountService instance
 */
export function createAccountService(): AccountService {
  const accountRepository = new AccountRepository();
  return new AccountService(accountRepository);
}

// Export service classes for direct usage if needed
export { AccountService };
