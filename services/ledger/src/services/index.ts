import { LedgerService } from './ledger-service';

/**
 * Creates a LedgerService instance
 * This factory function allows for easier mocking in tests
 * @returns LedgerService instance
 */
export function createLedgerService(): LedgerService {
  return new LedgerService();
}

// Export service classes for direct usage if needed
export { LedgerService };
