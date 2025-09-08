import { AccountService } from './account-service';
import { AccountRepository } from './repositories';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { AccountServiceConfig } from '@digital-banking/config';
import { createOrUseDynamoDbClient } from '@digital-banking/utils';

/**
 * Creates an AccountService instance with its dependencies
 * This factory function allows for easier mocking in tests
 * @param dynamoClient - Optional DynamoDB client (creates default if not provided)
 * @param config - Optional configuration (uses env vars if not provided)
 * @returns AccountService instance
 */
export function createAccountService(
  dynamoClient?: DynamoDBDocumentClient,
  config?: AccountServiceConfig
): AccountService {
  // Create default DynamoDB client if not provided
  const dbClient = createOrUseDynamoDbClient(dynamoClient);
  
  // Use provided config or create default from environment
  const serviceConfig = config || AccountServiceConfig.fromEnvironment();

  const accountRepository = new AccountRepository(dbClient, serviceConfig.accountTableName, serviceConfig.outboxTableName);
  return new AccountService(accountRepository);
}
