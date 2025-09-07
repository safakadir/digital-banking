import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Metrics } from '@aws-lambda-powertools/metrics';

/**
 * Bundle of telemetry tools used across services
 */
export interface TelemetryBundle {
  logger: Logger;
  tracer: Tracer;
  metrics: Metrics;
}

/**
 * Creates a default telemetry bundle
 */
export function createDefaultTelemetryBundle(): TelemetryBundle {
  return {
    logger: new Logger(),
    tracer: new Tracer(),
    metrics: new Metrics()
  };
}
