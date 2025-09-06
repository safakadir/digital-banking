import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import middy from '@middy/core';
import { Logger } from '@aws-lambda-powertools/logger';
import { BaseError } from '@digital-banking/errors';

/**
 * Validator function type
 */
export type Validator = (event: APIGatewayProxyEvent) => void | Promise<void>;

/**
 * Middleware for request validation
 * @param validator - Validator function
 * @param logger - Logger instance
 */
export const validatorMiddleware = (validator: Validator, logger: Logger) => {
  const before: middy.MiddlewareFn<APIGatewayProxyEvent, APIGatewayProxyResult> = async (request) => {
    try {
      await validator(request.event);
      return; // Explicitly return undefined to continue the middleware chain
    } catch (error) {
      if (error instanceof BaseError) {
        logger.warn(`Validation failed: ${error.message}`, { error });
        return {
          statusCode: error.statusCode,
          body: JSON.stringify({ message: error.message })
        };
      }
      
      logger.error('Unexpected validation error', { error });
      throw error;
    }
  };

  return { before };
};
