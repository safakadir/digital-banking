import { BankingService } from './banking-service';
import { 
  OperationRepository, 
  AccountsProjectionRepository 
} from '../repositories/dynamodb';

/**
 * Creates a BankingService instance with injected repositories
 * This factory function allows for easier mocking in tests
 * @returns BankingService instance
 */
export function createBankingService(): BankingService {
  // Create repository instances
  const operationRepository = new OperationRepository();
  const accountsProjectionRepository = new AccountsProjectionRepository();
  
  // Inject repositories into service
  return new BankingService(operationRepository, accountsProjectionRepository);
}

// Export service classes and repositories for direct usage if needed
export { BankingService };
export * from '../repositories';
