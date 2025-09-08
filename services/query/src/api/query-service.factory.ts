import { QueryService } from './query-service';
import {
  BalanceRepository,
  TransactionRepository,
  AccountProjectionRepository
} from './repositories/dynamodb';

/**
 * Creates a QueryService instance with dependency injection
 * This factory function allows for easier mocking in tests
 * @returns QueryService instance
 */
export function createQueryService(): QueryService {
  const balanceRepository = new BalanceRepository();
  const transactionRepository = new TransactionRepository();
  const accountProjectionRepository = new AccountProjectionRepository();

  return new QueryService(
    balanceRepository,
    transactionRepository,
    accountProjectionRepository
  );
}