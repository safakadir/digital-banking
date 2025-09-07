import { commonApiMiddleware, validationMiddleware, errorHandlerMiddleware } from "@digital-banking/middleware";
import { TelemetryBundle } from "@digital-banking/utils";
import { GetAccountResponse } from "../../dto";
import { validateAccountIdParam } from "../../validators";
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
  
  // Build response DTO
  const response: GetAccountResponse = account;
  
  // Return success response
  return {
    statusCode: 200,
    body: JSON.stringify(response)
  };
}, telemetry)
  .use(validationMiddleware(validateAccountIdParam, telemetry))
  .use(errorHandlerMiddleware(telemetry))
