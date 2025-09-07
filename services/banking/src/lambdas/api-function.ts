import httpRouter from '@middy/http-router';
import { createBankingService } from '../services';
import { createDefaultTelemetryBundle } from '@digital-banking/utils';
import { depositHandler } from './api-handlers/deposit-handler';
import { withdrawHandler } from './api-handlers/withdraw-handler';
import { operationHandler } from './api-handlers/operation-handler';

/**
 * Creates an API handler with dependency injection support
 * @param queryService - QueryService instance
 * @param telemetry - TelemetryBundle instance
 * @returns HTTP router handler
 */
export function createApiFunctionHandler(
  bankingService = createBankingService(),
  telemetry = createDefaultTelemetryBundle()
) {
  const { logger } = telemetry;
  return httpRouter([
  {
    method: 'POST',
    path: '/deposit',
    handler: depositHandler(bankingService, telemetry)
  },
  {
    method: 'POST',
    path: '/withdraw',
    handler: withdrawHandler(bankingService, telemetry)
  },
  {
    method: 'GET',
    path: '/operation-status/{operation_id}',
    handler: operationHandler(bankingService, telemetry)
  }
])};

// Export the default handler instance
export const apiFunctionHandler = createApiFunctionHandler();
