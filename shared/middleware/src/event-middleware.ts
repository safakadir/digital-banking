import middy from '@middy/core';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { TelemetryBundle } from '@digital-banking/utils';

/**
 * Common middleware for event handlers
 * Provides AWS Lambda Powertools integration for event processing
 * 
 * @param handler - Lambda event handler function
 * @param logger - Powertools logger instance
 * @param tracer - Powertools tracer instance
 * @param metrics - Powertools metrics instance
 * @returns Middleware-wrapped handler
 */
export const commonEventMiddleware = <TEvent = any, TResult = any>(
  handler: (event: TEvent) => Promise<TResult>,
  telemetry: TelemetryBundle
) => {
  // Create middleware chain
  return middy(handler)
    .use(captureLambdaHandler(telemetry.tracer))
    .use(injectLambdaContext(telemetry.logger, { clearState: true }))
    .use(logMetrics(telemetry.metrics, { captureColdStartMetric: true }));
};
