import { commonApiMiddleware, validationMiddleware, errorHandlerMiddleware } from "@digital-banking/middleware";
import { TelemetryBundle } from "@digital-banking/utils";
import { CreateAccountRequest } from "../../models";
import { validateCreateAccountRequest } from "../../validators/account-validators";
import { AccountService } from "../../services";

export const createAccountHandler = (
  accountService: AccountService, 
  telemetry: TelemetryBundle
) => commonApiMiddleware(async (event) => {
  const { logger } = telemetry;
  logger.info('Creating new account');
  
  // Extract user ID from Cognito authorizer context
  const userId = event.requestContext.authorizer?.claims?.sub || 'unknown';
  
  // Parse request body
  const body = event.body as any;
  
  const data: CreateAccountRequest = {
    name: body.name,
    currency: body.currency
  };
  
  // Call service layer
  const result = await accountService.createAccount(userId, data);
  
  // Return success response
  return {
    statusCode: 201,
    body: JSON.stringify({
      message: 'Account created successfully',
      ...result
    })
  };
}, telemetry)
  .use(validationMiddleware(validateCreateAccountRequest, telemetry))
  .use(errorHandlerMiddleware(telemetry))