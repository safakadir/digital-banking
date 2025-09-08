import { commonApiMiddleware } from '@digital-banking/middleware';
import { TelemetryBundle } from '@digital-banking/utils';
import { GetTransactionsResponse } from '../../dto';
import { QueryService } from '../../services';

export const getTransactionsHandler = (queryService: QueryService, telemetry: TelemetryBundle) =>
  commonApiMiddleware(async (event) => {
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

      // Build response DTO - map service transactions to proper Transaction model
      const response: GetTransactionsResponse = {
        transactions: result.transactions.map((tx: any) => ({
          id: tx.id,
          accountId: result.accountId,
          type: tx.type.toLowerCase() as 'deposit' | 'withdraw',
          amount: tx.amount,
          balance: tx.balance || 0, // Default balance if not provided
          status: (tx.status || 'completed').toLowerCase() as 'completed' | 'failed',
          timestamp: tx.timestamp,
          description: tx.description || `${tx.type} operation`
        }))
      };

      // Return success response
      return {
        statusCode: 200,
        body: JSON.stringify(response)
      };
    } catch (error) {
      logger.error('Error getting transactions', { error });
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Internal Server Error' })
      };
    }
  }, telemetry);
