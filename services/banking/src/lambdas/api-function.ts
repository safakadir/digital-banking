import httpRouter from '@middy/http-router';
import { createDefaultTelemetryBundle } from '@digital-banking/utils';
import { createBankingService } from '../api/banking-service.factory';
import { depositHandler } from '../api/routes/deposit-handler';
import { withdrawHandler } from '../api/routes/withdraw-handler';
import { operationHandler } from '../api/routes/operation-handler';

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
