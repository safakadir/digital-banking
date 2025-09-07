import httpRouter from '@middy/http-router';
import { createAccountService } from '../services';
import { createAccountHandler } from './api-handlers/create-account-handler';
import { closeAccountHandler } from './api-handlers/close-account-handler';
import { getAccountHandler } from './api-handlers/get-account-handler';
import { getAccountsHandler } from './api-handlers/get-accounts-handler';
import { createDefaultTelemetryBundle } from '@digital-banking/utils';

/**
 * Creates an API handler with dependency injection support
 * @param accountService - AccountService instance
 * @param telemetry - TelemetryBundle instance
 * @returns HTTP router handler
 */
export function createApiFunctionHandler(
  accountService = createAccountService(),
  telemetry = createDefaultTelemetryBundle()
) {
  const { logger } = telemetry;
  return httpRouter([
  {
    method: 'POST',
    path: '/accounts',
    handler: createAccountHandler(accountService, telemetry)
  },
  {
    method: 'PUT',
    path: '/accounts/{account_id}/close',
    handler: closeAccountHandler(accountService, telemetry)
  },
  {
    method: 'GET',
    path: '/accounts/{account_id}',
    handler: getAccountHandler(accountService, telemetry)
  },
  {
    method: 'GET',
    path: '/accounts',
    handler: getAccountsHandler(accountService, telemetry)
  }
])};

// Export the default handler instance
export const apiFunctionHandler = createApiFunctionHandler();
