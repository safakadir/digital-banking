import { QueryService } from './query-service';
import {
  BalanceRepository,
  TransactionRepository,
  AccountProjectionRepository
} from './repositories/dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { QueryServiceConfig } from '@digital-banking/config';
import { createOrUseDynamoDbClient } from '@digital-banking/utils';

/**
 * Creates a QueryService instance with dependency injection
 * This factory function allows for easier mocking in tests
 * @param dynamoClient - Optional DynamoDB client (creates default if not provided)
 * @param config - Optional configuration (uses env vars if not provided)
 * @returns QueryService instance
 */
export function createQueryService(
  dynamoClient?: DynamoDBDocumentClient,
  config?: QueryServiceConfig
): QueryService {
  // Create default DynamoDB client if not provided
  const dbClient = createOrUseDynamoDbClient(dynamoClient);
  
  // Use provided config or create default from environment
  const serviceConfig = config || QueryServiceConfig.fromEnvironment();

  const balanceRepository = new BalanceRepository(dbClient, serviceConfig.balanceTableName);
  const transactionRepository = new TransactionRepository(dbClient, serviceConfig.transactionTableName);
  const accountProjectionRepository = new AccountProjectionRepository(dbClient, serviceConfig.accountProjectionTableName);

  return new QueryService(
    balanceRepository,
    transactionRepository,
    accountProjectionRepository
  );
}