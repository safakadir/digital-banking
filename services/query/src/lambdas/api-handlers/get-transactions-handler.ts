import { commonApiMiddleware } from '@digital-banking/middleware';
import { TelemetryBundle } from '@digital-banking/utils';
import { QueryService } from '../../services';

export const getTransactionsHandler = (
  queryService: QueryService,
  telemetry: TelemetryBundle
) => commonApiMiddleware(async (event) => {
  const { logger } = telemetry;
  try {
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
    
    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    logger.error('Error getting transactions', { error });
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' })
    };
  }
}, telemetry);
