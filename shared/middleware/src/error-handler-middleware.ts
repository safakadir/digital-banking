import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import middy from '@middy/core';
import { BaseError } from '@digital-banking/errors';
import { TelemetryBundle } from '@digital-banking/utils';

/**
 * Middleware for error handling
 * @param telemetry - Telemetry bundle containing logger
 */
export const errorHandlerMiddleware = (telemetry: TelemetryBundle) => {
  const { logger } = telemetry;
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
