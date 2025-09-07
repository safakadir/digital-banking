import { commonApiMiddleware, validationMiddleware, errorHandlerMiddleware } from "@digital-banking/middleware";
import { TelemetryBundle } from "@digital-banking/utils";
import { GetAccountsResponse } from "../../dto";
import { validateGetAccountsRequest } from "../../validators";
import { AccountService } from "../../services";

export const getAccountsHandler = (
  accountService: AccountService, 
  telemetry: TelemetryBundle
) => commonApiMiddleware(async (event) => {
  const { logger } = telemetry;
  // Extract user ID from Cognito authorizer context
  const userId = event.requestContext.authorizer?.claims?.sub || 'unknown';
  logger.info('Getting all accounts', { userId });
  
  // Call service layer
  const result = await accountService.getAccounts(userId);
  
  // Build response DTO
  const response: GetAccountsResponse = result;
  
  // Return success response
  return {
    statusCode: 200,
    body: JSON.stringify(response)
  };
}, telemetry)
  .use(validationMiddleware(validateGetAccountsRequest, telemetry))
  .use(errorHandlerMiddleware(telemetry))
