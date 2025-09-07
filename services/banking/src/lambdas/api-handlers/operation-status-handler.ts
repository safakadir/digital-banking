import { commonApiMiddleware } from '@digital-banking/middleware';
import { TelemetryBundle } from '@digital-banking/utils';
import { OperationStatusResponse } from '../../dto';
import { BankingService } from '../../services';

export const operationStatusHandler = (
  bankingService: BankingService,
  telemetry: TelemetryBundle
) => commonApiMiddleware(async (event) => {
  const { logger } = telemetry;
  try {
    const operationId = event.pathParameters?.operation_id;
    if (!operationId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Operation ID is required' })
      };
    }
    
    logger.info('Getting operation status', { operationId });
    
    // Call service layer
    const result = await bankingService.getOperationStatus(operationId);
    
    // Build response DTO
    const response: OperationStatusResponse = {
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
  } catch (error) {
    logger.error('Error getting operation status', { error });
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' })
    };
  }
}, telemetry);
