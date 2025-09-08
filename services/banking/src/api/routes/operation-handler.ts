import {
  commonApiMiddleware,
  validationMiddleware,
  errorHandlerMiddleware
} from '@digital-banking/middleware';
import { TelemetryBundle } from '@digital-banking/utils';
import { OperationResponse } from '../dto';
import { BankingService } from '../banking-service';
import { validateOperationRequest } from '../validators';

export const operationHandler = (bankingService: BankingService, telemetry: TelemetryBundle) =>
  commonApiMiddleware(async (event) => {
    const { logger } = telemetry;

    // Get operation ID from path parameters (validation already done by middleware)
    const operationId = event.pathParameters?.operation_id as string;

    logger.info('Getting operation', { operationId });

    // Call service layer
    const result = await bankingService.getOperation(operationId);

    // Build response DTO
    const response: OperationResponse = {
      operationId: result.operationId,
      accountId: result.accountId,
      type: result.type as 'deposit' | 'withdraw',
      amount: result.amount,
      status: result.status as 'pending' | 'completed' | 'failed',
      createdAt: result.timestamp, // Map timestamp to createdAt
      completedAt: result.status === 'COMPLETED' ? result.timestamp : undefined
    };

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };
  }, telemetry)
    .use(validationMiddleware(validateOperationRequest, telemetry))
    .use(errorHandlerMiddleware(telemetry));
