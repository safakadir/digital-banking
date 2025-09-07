import { TelemetryBundle } from '@digital-banking/utils';
import { QueryService } from '../../services';
import { BankingEvent } from '@digital-banking/events';

export const withdrawFailedEventHandler = (
  queryService: QueryService,
  telemetry: TelemetryBundle
) => async (message: BankingEvent): Promise<void> => {
  const { logger } = telemetry;
  
  if (message.type !== 'WITHDRAW_FAILED_EVENT') {
    logger.warn('Invalid event type for withdraw failed handler', { eventType: message.type });
    return;
  }
  
  logger.info('Processing withdraw failed event', { accountId: message.accountId });
  await queryService.processWithdrawFailedEvent(message);
};
