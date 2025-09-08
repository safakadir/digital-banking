import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpErrorHandler from '@middy/http-error-handler';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { TelemetryBundle } from '@digital-banking/utils';

/**
 * Common middleware for all API handlers
 * Provides HTTP parsing, error handling, and AWS Lambda Powertools integration
 *
 * @param handler - Lambda handler function
 * @param telemetry - Telemetry bundle containing logger, tracer, and metrics
 * @returns Middleware-wrapped handler
 */
export const commonApiMiddleware = (
  handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>,
  telemetry: TelemetryBundle
) => {
  // Create middleware chain with HTTP handlers
  return middy(handler)
    .use(httpHeaderNormalizer())
    .use(httpJsonBodyParser())
    .use(httpErrorHandler())
    .use(captureLambdaHandler(telemetry.tracer))
    .use(injectLambdaContext(telemetry.logger, { clearState: true }))
    .use(logMetrics(telemetry.metrics, { captureColdStartMetric: true }));
};
