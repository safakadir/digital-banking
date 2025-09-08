import { commonApiMiddleware } from '@digital-banking/middleware';
import { TelemetryBundle } from '@digital-banking/utils';
import { GetBalancesResponse } from '../dto';
import { QueryService } from '../query-service';

export const getBalancesHandler = (queryService: QueryService, telemetry: TelemetryBundle) =>
  commonApiMiddleware(async (event) => {
    const { logger } = telemetry;

    // Extract user ID from Cognito authorizer context
    const userId = event.requestContext.authorizer?.claims?.sub || 'unknown';
    logger.info('Getting all balances', { userId });

    // Call service layer - getBalances now returns BalanceWithAccountInfo[]
    const balancesWithAccountInfo = await queryService.getBalances(userId);

    // Build response DTO - the service already returns the correct format
    const response: GetBalancesResponse = balancesWithAccountInfo;

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };
  }, telemetry);
