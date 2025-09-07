import { commonApiMiddleware } from '@digital-banking/middleware';
import { TelemetryBundle } from '@digital-banking/utils';
import { BankingService } from '../../services';

export const depositHandler = (
  bankingService: BankingService,
  telemetry: TelemetryBundle
) => commonApiMiddleware(async (event) => {
  const { logger } = telemetry;
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    
    // Validate request
    if (!body.accountId || !body.amount) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Account ID and amount are required' })
      };
    }
    
    logger.info('Processing deposit request', { accountId: body.accountId, amount: body.amount });
    
    // Call service layer
    const result = await bankingService.processDeposit(body.accountId, body.amount);
    
    // Return success response
    return {
      statusCode: 202,
      body: JSON.stringify({
        message: 'Deposit operation initiated',
        ...result
      })
    };
  } catch (error) {
    logger.error('Error processing deposit', { error });
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' })
    };
  }
}, telemetry);
