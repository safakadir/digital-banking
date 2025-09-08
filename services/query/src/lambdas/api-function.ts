import httpRouter from '@middy/http-router';
import { createQueryService } from '../api/query-service.factory';
import { getTransactionsHandler } from '../api/routes/get-transactions-handler';
import { getBalanceHandler } from '../api/routes/get-balance-handler';
import { getBalancesHandler } from '../api/routes/get-balances-handler';
import { createDefaultTelemetryBundle } from '@digital-banking/utils';

/**
 * Creates an API handler with dependency injection support
 * @param queryService - QueryService instance
 * @param logger - Logger instance
 * @param tracer - Tracer instance
 * @param metrics - Metrics instance
 * @returns HTTP router handler
 */
export function createApiFunctionHandler(
  queryService = createQueryService(),
  telemetry = createDefaultTelemetryBundle()
) {
  return httpRouter([
    {
      method: 'GET',
      path: '/transactions/{account_id}',
      handler: getTransactionsHandler(queryService, telemetry)
    },
    {
      method: 'GET',
      path: '/balances/{account_id}',
      handler: getBalanceHandler(queryService, telemetry)
    },
    {
      method: 'GET',
      path: '/balances',
      handler: getBalancesHandler(queryService, telemetry)
    }
  ]);
}

// Export the default handler instance
export const apiFunctionHandler = createApiFunctionHandler();
