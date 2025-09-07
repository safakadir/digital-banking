import { commonApiMiddleware, validationMiddleware, errorHandlerMiddleware } from '@digital-banking/middleware';
import { TelemetryBundle } from '@digital-banking/utils';
import { DepositResponse } from '../dto';
import { BankingService } from '../banking-service';
import { validateDepositRequest } from '../validators';

export const depositHandler = (
  bankingService: BankingService,
  telemetry: TelemetryBundle
) => commonApiMiddleware(async (event) => {
  const { logger } = telemetry;
  
  // Parse request body (validation already done by middleware)
  const body = event.body as any;
  
  // Extract user ID from Cognito authorizer context (validation already done by middleware)
  const userId = event.requestContext.authorizer?.claims?.sub as string;
  
  logger.info('Processing deposit request', { accountId: body.accountId, amount: body.amount, userId });
  
  // Call service layer
  const result = await bankingService.processDeposit(body.accountId, body.amount, userId);
  
  // Build response DTO
  const response: DepositResponse = {
    message: 'Deposit operation initiated',
    operationId: result.operationId,
    status: 'pending'
  };
  
  // Return success response
  return {
    statusCode: 202,
    body: JSON.stringify(response)
  };
}, telemetry)
  .use(validationMiddleware(validateDepositRequest, telemetry))
  .use(errorHandlerMiddleware(telemetry));
