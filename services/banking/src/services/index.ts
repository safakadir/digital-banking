import { BankingService } from './banking-service';

/**
 * Creates a BankingService instance
 * This factory function allows for easier mocking in tests
 * @returns BankingService instance
 */
export function createBankingService(): BankingService {
  return new BankingService();
}

// Export service classes for direct usage if needed
export { BankingService };
