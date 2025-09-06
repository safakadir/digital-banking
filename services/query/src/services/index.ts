import { QueryService } from './query-service';

/**
 * Creates a QueryService instance
 * This factory function allows for easier mocking in tests
 * @returns QueryService instance
 */
export function createQueryService(): QueryService {
  return new QueryService();
}

// Export service classes for direct usage if needed
export { QueryService };
