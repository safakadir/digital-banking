import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import middy from '@middy/core';
import { BaseError } from '@digital-banking/errors';
import { TelemetryBundle } from '@digital-banking/utils';

/**
 * Validator function type
 */
export type Validator = (event: APIGatewayProxyEvent) => void | Promise<void>;

/**
 * Middleware for request validation
 * @param validator - Validator function
 * @param telemetry - Telemetry bundle containing logger
 */
export const validationMiddleware = (validator: Validator, telemetry: TelemetryBundle) => {
  const { logger } = telemetry;
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
