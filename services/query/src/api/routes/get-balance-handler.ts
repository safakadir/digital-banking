import { commonApiMiddleware } from '@digital-banking/middleware';
import { TelemetryBundle } from '@digital-banking/utils';
import { GetBalanceResponse } from '../dto';
import { QueryService } from '../query-service';

export const getBalanceHandler = (queryService: QueryService, telemetry: TelemetryBundle) =>
  commonApiMiddleware(async (event) => {
    const { logger } = telemetry;

    const accountId = event.pathParameters?.account_id;
    if (!accountId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Account ID is required' })
      };
    }

    logger.info('Getting balance', { accountId });

    // Call service layer - getBalance now returns Balance object directly
    const balance = await queryService.getBalance(accountId);

    // Build response DTO - service already returns the correct format
    const response: GetBalanceResponse = balance;

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };
  
  }, telemetry);
