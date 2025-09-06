import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { Tracer } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpErrorHandler from '@middy/http-error-handler';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';

/**
 * Common middleware for all API handlers
 * Provides HTTP parsing, error handling, and AWS Lambda Powertools integration
 * 
 * @param handler - Lambda handler function
 * @param logger - Powertools logger instance
 * @param tracer - Powertools tracer instance
 * @param metrics - Powertools metrics instance
 * @returns Middleware-wrapped handler
 */
export const commonApiMiddleware = (
  handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>,
  logger: Logger,
  tracer: Tracer,
  metrics: Metrics
) => {
  // Create middleware chain with HTTP handlers
  return middy(handler)
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .use(httpErrorHandler())
    .use(captureLambdaHandler(tracer))
    .use(injectLambdaContext(logger, { clearState: true }))
    .use(logMetrics(metrics, { captureColdStartMetric: true }))
};
