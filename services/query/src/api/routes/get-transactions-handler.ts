import { commonApiMiddleware } from '@digital-banking/middleware';
import { TelemetryBundle } from '@digital-banking/utils';
import { GetTransactionsResponse } from '../dto';
import { QueryService } from '../query-service';

export const getTransactionsHandler = (queryService: QueryService, telemetry: TelemetryBundle) =>
  commonApiMiddleware(async (event) => {
    const { logger } = telemetry;
 
    const accountId = event.pathParameters?.account_id;
    if (!accountId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Account ID is required' })
      };
    }

    logger.info('Getting transactions', { accountId });

    // Call service layer
    const result = await queryService.getTransactions(accountId);

    // Build response DTO - service already returns transactions in correct format
    const response: GetTransactionsResponse = result;

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };
  }, telemetry);
