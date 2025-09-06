import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { Tracer } from '@aws-lambda-powertools/tracer';
import httpRouter from '@middy/http-router';
import { createQueryService } from '../services';
import { commonApiMiddleware } from '@digital-banking/middleware';

/**
 * Creates an API handler with dependency injection support
 * @param queryService - QueryService instance
 * @param logger - Logger instance
 * @param tracer - Tracer instance
 * @param metrics - Metrics instance
 * @returns HTTP router handler
 */
export function createApiFunctionHandler(
  queryService = createQueryService(),
  logger = new Logger(),
  tracer = new Tracer(),
  metrics = new Metrics()
) {
  return httpRouter([
  {
    method: 'GET',
    path: '/transactions/{account_id}',
    handler: commonApiMiddleware(async (event) => {
      try {
        const accountId = event.pathParameters?.account_id;
        if (!accountId) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Account ID is required' })
          };
        }
        
        logger.info('Getting transactions', { accountId });
        
        // Call service layer
        const result = await queryService.getTransactions(accountId);
        
        // Return success response
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      } catch (error) {
        logger.error('Error getting transactions', { error });
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Internal Server Error' })
        };
      }
    }, logger, tracer, metrics)
  },
  {
    method: 'GET',
    path: '/balances/{account_id}',
    handler: commonApiMiddleware(async (event) => {
      try {
        const accountId = event.pathParameters?.account_id;
        if (!accountId) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Account ID is required' })
          };
        }
        
        logger.info('Getting balance', { accountId });
        
        // Call service layer
        const result = await queryService.getBalance(accountId);
        
        // Return success response
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      } catch (error) {
        logger.error('Error getting balance', { error });
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Internal Server Error' })
        };
      }
    }, logger, tracer, metrics)
  },
  {
    method: 'GET',
    path: '/balances',
    handler: commonApiMiddleware(async (event) => {
      try {
        // Extract user ID from Cognito authorizer context
        const userId = event.requestContext.authorizer?.claims?.sub || 'unknown';
        logger.info('Getting all balances', { userId });
        
        // Call service layer
        const result = await queryService.getBalances(userId);
        
        // Return success response
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      } catch (error) {
        logger.error('Error getting balances', { error });
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Internal Server Error' })
        };
      }
    }, logger, tracer, metrics)
  }
  ]);
}

// Export the default handler instance
export const apiFunctionHandler = createApiFunctionHandler();
