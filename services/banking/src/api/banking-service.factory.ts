import { BankingService } from "./banking-service";
import { AccountsProjectionRepository } from "./repositories/dynamodb/accounts-projection.repository";
import { OperationRepository } from "./repositories/dynamodb/operation.repository";

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
