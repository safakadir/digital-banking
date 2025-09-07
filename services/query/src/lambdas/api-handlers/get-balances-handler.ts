import { commonApiMiddleware } from '@digital-banking/middleware';
import { TelemetryBundle } from '@digital-banking/utils';
import { QueryService } from '../../services';

export const getBalancesHandler = (
  queryService: QueryService,
  telemetry: TelemetryBundle
) => commonApiMiddleware(async (event) => {
  const { logger } = telemetry;
  try {
    // Extract user ID from Cognito authorizer context
    const userId = event.requestContext.authorizer?.claims?.sub || 'unknown';
    logger.info('Getting all balances', { userId });
    
    // Call service layer
    const result = await queryService.getBalances(userId);
    
    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    logger.error('Error getting balances', { error });
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' })
    };
  }
}, telemetry);
