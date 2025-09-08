import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * Configuration options for DynamoDB client creation
 */
export interface DynamoDBClientOptions {
  region?: string;
  marshallOptions?: {
    removeUndefinedValues?: boolean;
    convertEmptyValues?: boolean;
    convertClassInstanceToMap?: boolean;
  };
}

/**
 * Creates a DynamoDB DocumentClient with consistent configuration
 * This factory ensures all services use the same DynamoDB client settings
 * 
 * @param options - Optional configuration for the client
 * @returns Configured DynamoDBDocumentClient instance
 */
export function createDynamoDbClient(options: DynamoDBClientOptions = {}): DynamoDBDocumentClient {
  const {
    region = process.env.AWS_REGION || 'us-east-1',
    marshallOptions = {
      removeUndefinedValues: true
    }
  } = options;

  const client = new DynamoDBClient({ region });
  
  return DynamoDBDocumentClient.from(client, {
    marshallOptions
  });
}

/**
 * Creates a DynamoDB DocumentClient with provided client or default configuration
 * This is a convenience function for dependency injection scenarios
 * 
 * @param providedClient - Optional pre-configured client (for testing/mocking)
 * @param options - Optional configuration for default client creation
 * @returns DynamoDBDocumentClient instance
 */
export function createOrUseDynamoDbClient(
  providedClient?: DynamoDBDocumentClient,
  options?: DynamoDBClientOptions
): DynamoDBDocumentClient {
  return providedClient || createDynamoDbClient(options);
}
