import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import middy from '@middy/core';
import { Logger } from '@aws-lambda-powertools/logger';
import { BaseError } from '@digital-banking/errors';

/**
 * Middleware for error handling
 * @param logger - Logger instance
 */
export const errorHandlerMiddleware = (logger: Logger) => {
  const onError: middy.MiddlewareFn<APIGatewayProxyEvent, APIGatewayProxyResult> = async (request) => {
    const { error } = request;
    
    logger.error('Error in request handler', { error });
    
    // Handle known error types
    if (error instanceof BaseError) {
      request.response = {
        statusCode: error.statusCode,
        body: JSON.stringify({ message: error.message })
      };
      return;
    }
    
    // Default error response for unexpected errors
    request.response = {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' })
    };
  };

  return { onError };
};
