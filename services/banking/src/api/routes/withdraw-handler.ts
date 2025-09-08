import {
  commonApiMiddleware,
  validationMiddleware,
  errorHandlerMiddleware
} from '@digital-banking/middleware';
import { TelemetryBundle } from '@digital-banking/utils';
import { WithdrawResponse } from '../dto';
import { BankingService } from '../banking-service';
import { validateWithdrawRequest } from '../validators';

export const withdrawHandler = (bankingService: BankingService, telemetry: TelemetryBundle) =>
  commonApiMiddleware(async (event) => {
    const { logger } = telemetry;

    // Parse request body (validation already done by middleware)
    const body = event.body as any;

    // Extract user ID from Cognito authorizer context (validation already done by middleware)
    const userId = event.requestContext.authorizer?.claims?.sub as string;

    logger.info('Processing withdraw request', {
      accountId: body.accountId,
      amount: body.amount,
      userId
    });

    // Call service layer
    const result = await bankingService.processWithdraw(body.accountId, body.amount, userId);

    // Build response DTO
    const response: WithdrawResponse = {
      message: 'Withdraw operation initiated',
      operationId: result.operationId,
      status: 'pending'
    };

    // Return success response
    return {
      statusCode: 202,
      body: JSON.stringify(response)
    };
  }, telemetry)
    .use(validationMiddleware(validateWithdrawRequest, telemetry))
    .use(errorHandlerMiddleware(telemetry));
