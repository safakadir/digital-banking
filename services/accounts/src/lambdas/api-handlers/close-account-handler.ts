import { commonApiMiddleware, validationMiddleware, errorHandlerMiddleware } from "@digital-banking/middleware";
import { TelemetryBundle } from "@digital-banking/utils";
import { validateAccountIdParam } from "../../validators/account-validators";
import { AccountService } from "../../services";

export const closeAccountHandler = (
  accountService: AccountService, 
  telemetry: TelemetryBundle
) => commonApiMiddleware(async (event) => {
  const { logger } = telemetry;
  const accountId = event.pathParameters?.account_id as string;
  
  logger.info('Closing account', { accountId });
  
  // Call service layer
  await accountService.closeAccount(accountId);
  
  // Return success response
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Account closed successfully',
      accountId
    })
  };
}, telemetry)
  .use(validationMiddleware(validateAccountIdParam, telemetry))
  .use(errorHandlerMiddleware(telemetry))
