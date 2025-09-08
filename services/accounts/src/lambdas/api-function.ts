import httpRouter from '@middy/http-router';
import { createDefaultTelemetryBundle } from '@digital-banking/utils';
import { createAccountService } from '../api/account-service.factory';
import { createAccountHandler } from '../api/routes/create-account-handler';
import { closeAccountHandler } from '../api/routes/close-account-handler';
import { getAccountHandler } from '../api/routes/get-account-handler';
import { getAccountsHandler } from '../api/routes/get-accounts-handler';

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
  ]);
}

// Export the default handler instance
export const apiFunctionHandler = createApiFunctionHandler();
