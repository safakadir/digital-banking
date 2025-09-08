import { BankingService } from './banking-service';
import { AccountsProjectionRepository } from './repositories/dynamodb/accounts-projection.repository';
import { OperationRepository } from './repositories/dynamodb/operation.repository';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { BankingServiceConfig } from '@digital-banking/config';
import { createOrUseDynamoDbClient } from '@digital-banking/utils';

/**
 * Creates a BankingService instance with injected repositories
 * This factory function allows for easier mocking in tests
 * @param dynamoClient - Optional DynamoDB client (creates default if not provided)
 * @param config - Optional configuration (uses env vars if not provided)
 * @returns BankingService instance
 */
export function createBankingService(
  dynamoClient?: DynamoDBDocumentClient,
  config?: BankingServiceConfig
): BankingService {
  // Create default DynamoDB client if not provided
  const dbClient = createOrUseDynamoDbClient(dynamoClient);
  
  // Use provided config or create default from environment
  const serviceConfig = config || BankingServiceConfig.fromEnvironment();

  // Create repository instances
  const operationRepository = new OperationRepository(dbClient, serviceConfig.operationsTableName, serviceConfig.outboxTableName);
  const accountsProjectionRepository = new AccountsProjectionRepository(dbClient, serviceConfig.accountProjectionTableName);

  // Inject repositories into service
  return new BankingService(operationRepository, accountsProjectionRepository);
}
