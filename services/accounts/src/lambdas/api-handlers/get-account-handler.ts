import { commonApiMiddleware, validationMiddleware, errorHandlerMiddleware } from "@digital-banking/middleware";
import { TelemetryBundle } from "@digital-banking/utils";
import { validateAccountIdParam } from "../../validators/account-validators";
import { AccountService } from "../../services";

export const getAccountHandler = (
  accountService: AccountService, 
  telemetry: TelemetryBundle
) => commonApiMiddleware(async (event) => {
  const { logger } = telemetry;
  const accountId = event.pathParameters?.account_id as string;
  
  logger.info('Getting account details', { accountId });
  
  // Call service layer
  const account = await accountService.getAccount(accountId);
  
  // Return success response
  return {
    statusCode: 200,
    body: JSON.stringify(account)
  };
}, telemetry)
  .use(validationMiddleware(validateAccountIdParam, telemetry))
  .use(errorHandlerMiddleware(telemetry))
